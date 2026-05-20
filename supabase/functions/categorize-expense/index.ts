import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });

    const { payment_id } = await req.json();
    if (!payment_id) return new Response(JSON.stringify({ error: "payment_id required" }), { status: 400, headers: corsHeaders });

    // 1. Load payment + project chain
    const { data: payment, error: pErr } = await sb
      .from("payments")
      .select("*, projects(id, nom, ville, parent_id, type_projet)")
      .eq("id", payment_id)
      .single();
    if (pErr || !payment) throw new Error(pErr?.message || "Payment not found");

    const project: any = payment.projects;
    if (!project) {
      return new Response(JSON.stringify({ error: "Le paiement doit être lié à un projet." }), { status: 400, headers: corsHeaders });
    }

    // Find programme parent (root)
    let programmeId = project.type_projet === "programme" ? project.id : project.parent_id;
    let ville = project.ville as string | null;
    if (programmeId && programmeId !== project.id) {
      const { data: parent } = await sb.from("projects").select("id, type_projet").eq("id", programmeId).single();
      if (parent?.type_projet !== "programme") {
        // parent is not programme, try its parent
        programmeId = null;
      }
    }
    if (!programmeId) {
      return new Response(JSON.stringify({ error: "Aucun budget intelligent trouvé pour ce projet." }), { status: 400, headers: corsHeaders });
    }

    // 2. Load active budget
    const { data: budgets } = await sb
      .from("budgets")
      .select("*")
      .eq("project_id", programmeId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1);
    const budget = budgets?.[0];
    if (!budget) {
      return new Response(JSON.stringify({ error: "Aucun budget actif pour ce programme." }), { status: 400, headers: corsHeaders });
    }

    // 3. Load lines (filter by ville if present)
    const { data: allLines } = await sb
      .from("budget_lines")
      .select("id, libelle, description, montant_prevu, villes, category_id")
      .eq("budget_id", budget.id);
    let lines = allLines || [];
    if (ville && lines.length > 0) {
      const villeNorm = normalize(ville);
      const filtered = lines.filter((l: any) => {
        const v = (l.villes || []) as string[];
        if (v.length === 0) return true;
        return v.some((x) => normalize(x) === villeNorm);
      });
      if (filtered.length > 0) lines = filtered;
    }

    // 4. Try learned rules first
    const motifNorm = normalize(`${payment.motif} ${payment.beneficiaire_nom || ""} ${payment.commentaire || ""}`);
    const { data: rules } = await sb
      .from("categorization_rules")
      .select("*")
      .in("budget_line_id", lines.map((l: any) => l.id));
    let chosenLineId: string | null = null;
    let confidence = 0;
    let reasoning = "";
    let source: "rule" | "ia_auto" = "ia_auto";

    for (const rule of rules || []) {
      const pattern = normalize(rule.pattern || "");
      if (pattern && motifNorm.includes(pattern)) {
        chosenLineId = rule.budget_line_id;
        confidence = Math.min(0.95, 0.7 + (rule.match_count || 1) * 0.05);
        reasoning = `Règle apprise : "${rule.pattern}"`;
        source = "rule";
        break;
      }
    }

    // 5. AI fallback
    if (!chosenLineId && lines.length > 0) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

      const linesPayload = lines.slice(0, 80).map((l: any) => ({
        id: l.id,
        libelle: l.libelle,
        description: (l.description || "").slice(0, 200),
        montant: l.montant_prevu,
        villes: l.villes || [],
      }));

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "Tu es un comptable d'ONG. Tu dois imputer une dépense à UNE seule ligne budgétaire parmi celles fournies. Réponds via l'outil pick_line. Si aucune ligne ne correspond raisonnablement, réponds avec line_id=null et confidence=0.",
            },
            {
              role: "user",
              content: JSON.stringify({
                depense: {
                  motif: payment.motif,
                  montant: payment.montant,
                  devise: payment.devise,
                  beneficiaire: payment.beneficiaire_nom,
                  categorie: payment.categorie,
                  lieu: payment.lieu,
                  ville_projet: ville,
                  commentaire: payment.commentaire,
                },
                lignes_budgetaires: linesPayload,
              }),
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "pick_line",
                description: "Choisir la meilleure ligne budgétaire pour la dépense.",
                parameters: {
                  type: "object",
                  properties: {
                    line_id: { type: ["string", "null"] },
                    confidence: { type: "number", minimum: 0, maximum: 1 },
                    reasoning: { type: "string" },
                  },
                  required: ["line_id", "confidence", "reasoning"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "pick_line" } },
        }),
      });

      if (aiResp.status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes IA, réessayez dans un instant.", fallback: true, suggestion: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés. Ajoutez des crédits dans Lovable Cloud.", fallback: true, suggestion: null }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (!aiResp.ok) {
        const t = await aiResp.text();
        console.error("AI error", aiResp.status, t);
        throw new Error("AI gateway error");
      }

      const aiJson = await aiResp.json();
      const call = aiJson.choices?.[0]?.message?.tool_calls?.[0];
      const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
      if (args?.line_id && lines.some((l: any) => l.id === args.line_id)) {
        chosenLineId = args.line_id;
        confidence = Math.max(0, Math.min(1, Number(args.confidence) || 0.5));
        reasoning = args.reasoning || "";
      }
    }

    if (!chosenLineId) {
      return new Response(
        JSON.stringify({ suggestion: null, message: "Aucune ligne budgétaire pertinente trouvée." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 6. Compute amount in budget currency
    let montant_devise_budget = payment.montant;
    if (payment.devise !== budget.devise) {
      // payment in XOF, budget in USD
      if (payment.devise === "XOF" && budget.devise === "USD") {
        montant_devise_budget = payment.montant / Number(budget.taux_change_xof || 600);
      } else if (payment.devise === "USD" && budget.devise === "XOF") {
        montant_devise_budget = payment.montant * Number(budget.taux_change_xof || 600);
      }
    }

    return new Response(
      JSON.stringify({
        suggestion: {
          budget_id: budget.id,
          budget_line_id: chosenLineId,
          confidence,
          reasoning,
          source,
          montant_alloue: payment.montant,
          montant_alloue_devise_budget: montant_devise_budget,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("categorize-expense error", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});