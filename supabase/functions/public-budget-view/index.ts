import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token") || (req.method === "POST" ? (await req.json().catch(() => ({}))).token : null);
    if (!token) return new Response(JSON.stringify({ error: "token requis" }), { status: 400, headers: corsHeaders });

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: link, error: lErr } = await sb.from("budget_share_links").select("*").eq("token", token).maybeSingle();
    if (lErr) throw lErr;
    if (!link) return new Response(JSON.stringify({ error: "Lien introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (link.revoked_at) return new Response(JSON.stringify({ error: "Lien révoqué" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (link.expires_at && new Date(link.expires_at) < new Date()) return new Response(JSON.stringify({ error: "Lien expiré" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const budget_id = link.budget_id;
    const [b, cats, lines, cons] = await Promise.all([
      sb.from("budgets").select("nom, devise, taux_change_xof, montant_total, status, project_id, projects(nom)").eq("id", budget_id).single(),
      sb.from("budget_categories").select("id, code, libelle, montant_prevu, ordre").eq("budget_id", budget_id).order("ordre"),
      sb.from("budget_lines").select("id, category_id, libelle, montant_prevu, villes, ordre").eq("budget_id", budget_id).order("ordre"),
      sb.from("v_budget_line_consumption").select("*").eq("budget_id", budget_id),
    ]);
    if (b.error) throw b.error;
    const lineIds = (lines.data || []).map((l: any) => l.id);
    const allocs = lineIds.length
      ? await sb.from("payment_budget_allocations")
          .select("id, budget_line_id, montant_alloue, montant_alloue_devise_budget, source, confidence, payments(reference, date_paiement, beneficiaire_nom, motif, devise, montant)")
          .in("budget_line_id", lineIds)
      : { data: [] };

    await sb.from("budget_share_links").update({ view_count: link.view_count + 1 }).eq("id", link.id);

    return new Response(JSON.stringify({
      budget: b.data, categories: cats.data, lines: lines.data, consumption: cons.data, allocations: allocs.data,
      allow_export: link.allow_export, label: link.label,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("public-budget-view error", e);
    return new Response(JSON.stringify({ error: e.message || "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});