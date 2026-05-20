import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { budget_id } = await req.json();
    if (!budget_id) return new Response(JSON.stringify({ error: "budget_id required" }), { status: 400, headers: corsHeaders });

    const [b, cats, lines, cons] = await Promise.all([
      sb.from("budgets").select("*, projects(nom, date_debut, date_fin)").eq("id", budget_id).single(),
      sb.from("budget_categories").select("id, code, libelle, montant_prevu, ordre").eq("budget_id", budget_id).order("ordre"),
      sb.from("budget_lines").select("id, category_id, libelle, description, justification, montant_prevu, villes").eq("budget_id", budget_id).order("ordre"),
      sb.from("v_budget_line_consumption").select("*").eq("budget_id", budget_id),
    ]);
    if (b.error) throw b.error;

    const consMap = new Map((cons.data || []).map((c: any) => [c.budget_line_id, c]));
    const ctx = {
      programme: b.data?.projects?.nom,
      devise: b.data?.devise,
      total: b.data?.montant_total,
      date_fin: b.data?.projects?.date_fin,
      jours_restants: b.data?.projects?.date_fin ? Math.max(0, Math.round((new Date(b.data.projects.date_fin).getTime() - Date.now()) / 86400000)) : null,
      rubriques: (cats.data || []).map((c: any) => ({
        id: c.id, code: c.code, libelle: c.libelle, prevu: Number(c.montant_prevu),
        lignes: (lines.data || []).filter((l: any) => l.category_id === c.id).map((l: any) => {
          const cn: any = consMap.get(l.id) || {};
          return {
            id: l.id, libelle: l.libelle, description: l.description, justification: l.justification,
            villes: l.villes, prevu: Number(l.montant_prevu),
            consomme: Number(cn.montant_consomme || 0),
            pct: Number(cn.pct_consomme || 0),
          };
        }),
      })),
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: "Tu es un contrôleur de gestion d'ONG francophone. Tu analyses un budget projet et tu proposes : 1) une synthèse exécutive (3 phrases max), 2) pour chaque ligne dépassée (>100%), 1 à 3 lignes 'donneuses' (sous-consommées, même rubrique de préférence) avec un montant suggéré à virer et la raison, 3) pour chaque ligne sous-consommée (<50%) avec peu de temps restant, 2 à 4 idées concrètes de dépenses alignées avec le libellé/justification/villes de la ligne. Tu réponds via l'outil emit_insights. Tout en français." },
          { role: "user", content: JSON.stringify(ctx) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "emit_insights",
            description: "Produit l'analyse structurée du budget",
            parameters: {
              type: "object",
              properties: {
                synthese: { type: "string" },
                alertes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      ligne_id: { type: "string" }, ligne: { type: "string" },
                      pct_consomme: { type: "number" }, depassement: { type: "number" },
                      suggestions: {
                        type: "array",
                        items: { type: "object", properties: {
                          ligne_donneuse_id: { type: "string" }, ligne_donneuse: { type: "string" },
                          montant_suggere: { type: "number" }, raison: { type: "string" },
                        }, required: ["ligne_donneuse_id", "ligne_donneuse", "montant_suggere", "raison"], additionalProperties: false },
                      },
                    },
                    required: ["ligne_id", "ligne", "pct_consomme", "depassement", "suggestions"], additionalProperties: false,
                  },
                },
                recommandations: {
                  type: "array",
                  items: { type: "object", properties: {
                    ligne_id: { type: "string" }, ligne: { type: "string" }, reste: { type: "number" },
                    idees: { type: "array", items: { type: "string" } },
                  }, required: ["ligne_id", "ligne", "reste", "idees"], additionalProperties: false },
                },
              },
              required: ["synthese", "alertes", "recommandations"], additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "emit_insights" } },
      }),
    });
    if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Trop de requêtes IA, réessayez dans un instant." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (aiResp.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!aiResp.ok) { const t = await aiResp.text(); console.error("AI error", aiResp.status, t); throw new Error("AI gateway error"); }
    const j = await aiResp.json();
    const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("Pas de réponse IA");
    const insights = JSON.parse(args);

    await sb.from("budget_insights").insert({ budget_id, insights });
    return new Response(JSON.stringify({ insights }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("budget-insights error", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});