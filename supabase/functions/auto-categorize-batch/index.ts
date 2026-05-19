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

async function callAI(payment: any, lines: any[], ville: string | null, apiKey: string) {
  const linesPayload = lines.slice(0, 80).map((l: any) => ({
    id: l.id,
    libelle: l.libelle,
    description: (l.description || "").slice(0, 200),
    montant: l.montant_prevu,
    villes: l.villes || [],
  }));

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
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

  if (resp.status === 429) return { error: "rate_limit" };
  if (resp.status === 402) return { error: "credits" };
  if (!resp.ok) {
    console.error("AI error", resp.status, await resp.text());
    return { error: "ai_error" };
  }
  const j = await resp.json();
  const call = j.choices?.[0]?.message?.tool_calls?.[0];
  const args = call?.function?.arguments ? JSON.parse(call.function.arguments) : null;
  return { args };
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

    const body = await req.json().catch(() => ({}));
    const budget_id: string = body.budget_id;
    const only_unallocated: boolean = body.only_unallocated !== false;
    if (!budget_id) return new Response(JSON.stringify({ error: "budget_id required" }), { status: 400, headers: corsHeaders });

    // Load budget
    const { data: budget, error: bErr } = await sb.from("budgets").select("*").eq("id", budget_id).single();
    if (bErr || !budget) throw new Error(bErr?.message || "Budget not found");

    // Load all budget lines once
    const { data: allLines } = await sb
      .from("budget_lines")
      .select("id, libelle, description, montant_prevu, villes, category_id")
      .eq("budget_id", budget_id);
    if (!allLines || allLines.length === 0) {
      return new Response(JSON.stringify({ error: "Aucune ligne budgétaire." }), { status: 400, headers: corsHeaders });
    }

    // Load all rules for these lines once
    const lineIds = allLines.map((l: any) => l.id);
    const { data: rules } = await sb.from("categorization_rules").select("*").in("budget_line_id", lineIds);
    const allRules = rules || [];

    // Find programme project + all sub-projects
    const programmeId = budget.project_id;
    const { data: subs } = await sb.from("projects").select("id, ville").or(`id.eq.${programmeId},parent_id.eq.${programmeId}`);
    const projectIds = (subs || []).map((p: any) => p.id);
    const villeByProject = new Map<string, string | null>((subs || []).map((p: any) => [p.id, p.ville]));

    // Load payments in these projects
    let pq = sb.from("payments").select("*").in("project_id", projectIds);
    const { data: payments, error: payErr } = await pq;
    if (payErr) throw payErr;

    // If only_unallocated: exclude payments that already have an allocation
    let toProcess = payments || [];
    if (only_unallocated && toProcess.length > 0) {
      const { data: existing } = await sb
        .from("payment_budget_allocations")
        .select("payment_id")
        .in("payment_id", toProcess.map((p: any) => p.id));
      const has = new Set((existing || []).map((e: any) => e.payment_id));
      toProcess = toProcess.filter((p: any) => !has.has(p.id));
    }

    console.log(`[batch] budget=${budget_id} payments=${toProcess.length} lines=${allLines.length} rules=${allRules.length}`);

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const summary = { traites: 0, imputes_auto: 0, a_valider: 0, non_imputes: 0, erreurs: 0 };
    const errors: any[] = [];

    for (const payment of toProcess) {
      summary.traites++;
      try {
        const ville = villeByProject.get(payment.project_id) || null;

        // Filter lines by ville if applicable
        let lines = allLines;
        if (ville) {
          const vn = normalize(ville);
          const filtered = allLines.filter((l: any) => {
            const v = (l.villes || []) as string[];
            if (v.length === 0) return true;
            return v.some((x) => normalize(x) === vn);
          });
          if (filtered.length > 0) lines = filtered;
        }

        // Try rules first
        const motifNorm = normalize(`${payment.motif} ${payment.beneficiaire_nom || ""} ${payment.commentaire || ""}`);
        let chosenLineId: string | null = null;
        let confidence = 0;
        let reasoning = "";
        let source: "rule" | "ia_auto" = "ia_auto";

        const lineIdSet = new Set(lines.map((l: any) => l.id));
        for (const rule of allRules) {
          if (!lineIdSet.has(rule.budget_line_id)) continue;
          const pat = normalize(rule.pattern || "");
          if (pat && motifNorm.includes(pat)) {
            chosenLineId = rule.budget_line_id;
            confidence = Math.min(0.95, 0.7 + (rule.match_count || 1) * 0.05);
            reasoning = `Règle apprise : "${rule.pattern}"`;
            source = "rule";
            break;
          }
        }

        // AI fallback
        if (!chosenLineId) {
          const r = await callAI(payment, lines, ville, apiKey);
          if (r.error === "rate_limit") {
            // wait longer and retry once
            await new Promise((res) => setTimeout(res, 2000));
            const r2 = await callAI(payment, lines, ville, apiKey);
            if (r2.args?.line_id && lineIdSet.has(r2.args.line_id)) {
              chosenLineId = r2.args.line_id;
              confidence = Math.max(0, Math.min(1, Number(r2.args.confidence) || 0.5));
              reasoning = r2.args.reasoning || "";
            }
          } else if (r.error === "credits") {
            return new Response(JSON.stringify({ error: "Crédits IA épuisés.", summary }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
          } else if (r.error) {
            summary.erreurs++;
            errors.push({ payment_id: payment.id, error: r.error });
            continue;
          } else if (r.args?.line_id && lineIdSet.has(r.args.line_id)) {
            chosenLineId = r.args.line_id;
            confidence = Math.max(0, Math.min(1, Number(r.args.confidence) || 0.5));
            reasoning = r.args.reasoning || "";
          }
        }

        if (!chosenLineId) {
          summary.non_imputes++;
          console.log(`[batch] ${payment.reference || payment.id}: aucune ligne trouvée`);
          continue;
        }

        // Compute amount in budget currency
        let montant_devise_budget = Number(payment.montant);
        if (payment.devise !== budget.devise) {
          if (payment.devise === "XOF" && budget.devise === "USD") {
            montant_devise_budget = Number(payment.montant) / Number(budget.taux_change_xof || 600);
          } else if (payment.devise === "USD" && budget.devise === "XOF") {
            montant_devise_budget = Number(payment.montant) * Number(budget.taux_change_xof || 600);
          }
        }

        const { error: insErr } = await sb.from("payment_budget_allocations").insert({
          payment_id: payment.id,
          budget_line_id: chosenLineId,
          montant_alloue: payment.montant,
          montant_alloue_devise_budget: montant_devise_budget,
          confidence,
          source,
          reasoning,
        });
        if (insErr) {
          summary.erreurs++;
          errors.push({ payment_id: payment.id, error: insErr.message });
          continue;
        }

        if (confidence >= 0.75) summary.imputes_auto++;
        else summary.a_valider++;

        console.log(`[batch] ${payment.reference || payment.id} -> ${chosenLineId} (conf ${confidence.toFixed(2)}, ${source})`);

        // Throttle AI calls
        if (source !== "rule") await new Promise((res) => setTimeout(res, 350));
      } catch (e: any) {
        summary.erreurs++;
        errors.push({ payment_id: payment.id, error: e.message });
        console.error("[batch] payment error", payment.id, e.message);
      }
    }

    return new Response(JSON.stringify({ summary, errors: errors.slice(0, 20) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("auto-categorize-batch error", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});