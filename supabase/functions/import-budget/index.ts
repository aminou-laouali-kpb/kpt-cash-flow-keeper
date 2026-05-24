import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ParsedLine {
  source_row: number;
  libelle: string;
  cost_unitaire: number | null;
  quantite: number | null;
  montant_prevu: number;
  cost_share: number;
}
interface ParsedRubrique {
  code: string;
  libelle: string;
  lignes: ParsedLine[];
  subtotal: number;
  subtotal_cost_share: number;
  justification: string;
}

function parseExcelToStructure(buffer: ArrayBuffer): {
  meta: { devise: string; total: number; total_cost_share: number; project_title?: string };
  rubriques: ParsedRubrique[];
  raw: any[][];
} {
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });

  let projectTitle: string | undefined;
  let total = 0;
  let totalShare = 0;
  const rubriques: ParsedRubrique[] = [];
  let current: ParsedRubrique | null = null;
  const num = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const isBlank = (v: any) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] || [];
    if (row.every(isBlank)) continue;
    const c0 = row[0];
    const c1 = row[1];
    const c2 = row[2];
    const c4 = row[4];
    const c7 = row[7];

    // Project title: row where c2 contains "Project title", title is c2 of next row
    if (typeof c2 === "string" && /project title/i.test(c2) && !projectTitle) {
      const next = rows[i + 1] || [];
      if (typeof next[2] === "string" && next[2].trim()) projectTitle = next[2].trim();
      continue;
    }
    // Total funds requested
    if (typeof c2 === "string" && /total funds requested/i.test(c2)) {
      total = num(c4) || total;
      totalShare = num(c7) || totalShare;
      continue;
    }
    // Overall total (fallback)
    if (typeof c0 === "string" && /overall total project costs/i.test(c0)) {
      total = total || num(c4);
      continue;
    }
    // Skip the " Project Costs ($USD)" totals row
    if (typeof c0 === "string" && /project costs \(\$usd\)/i.test(c0)) continue;

    // Rubrique: c0 integer 1..20, c1 non-empty string (not "Subtotal")
    if (
      typeof c0 === "number" &&
      Number.isInteger(c0) &&
      c0 >= 1 && c0 <= 20 &&
      typeof c1 === "string" &&
      c1.trim().length > 0 &&
      !/^subtotal/i.test(c1)
    ) {
      current = {
        code: String(c0),
        libelle: c1.trim(),
        lignes: [],
        subtotal: 0,
        subtotal_cost_share: 0,
        justification: "",
      };
      rubriques.push(current);
      continue;
    }

    // Subtotal row
    if (current && typeof c1 === "string" && /^subtotal/i.test(c1)) {
      current.subtotal = num(c4);
      current.subtotal_cost_share = num(c7);
      continue;
    }

    // Justification header → collect following text rows (in c0) until next rubrique/subtotal
    if (current && typeof c0 === "string" && /budget justification/i.test(c0)) {
      const parts: string[] = [];
      for (let j = i + 1; j < rows.length; j++) {
        const nr = rows[j] || [];
        const nc0 = nr[0];
        const nc1 = nr[1];
        // Stop on next rubrique or subtotal or new justification header
        if (typeof nc0 === "number" && Number.isInteger(nc0)) break;
        if (typeof nc1 === "string" && /^subtotal/i.test(nc1)) break;
        if (typeof nc0 === "string" && /budget justification/i.test(nc0)) break;
        if (typeof nc0 === "string" && nc0.trim().length > 0) parts.push(nc0.trim());
      }
      current.justification = parts.join("\n");
      continue;
    }

    // Budget line: c0 blank, c1 description string, c4 total > 0
    if (current && isBlank(c0) && typeof c1 === "string" && c1.trim().length > 0 && !/^subtotal/i.test(c1)) {
      const total_line = num(c4);
      if (total_line <= 0) continue;
      const cost = num(c2) || null;
      const qty = num(row[3]) || null;
      const cs_total = num(c7);
      current.lignes.push({
        source_row: i + 1,
        libelle: c1.trim(),
        cost_unitaire: cost,
        quantite: qty,
        montant_prevu: total_line,
        cost_share: cs_total,
      });
    }
  }

  console.log(`[import-budget] parsed: title="${projectTitle}", total=${total}, share=${totalShare}, rubriques=${rubriques.length}, lines=${rubriques.reduce((s, r) => s + r.lignes.length, 0)}`);

  return {
    meta: { devise: "USD", total, total_cost_share: totalShare, project_title: projectTitle },
    rubriques,
    raw: rows,
  };
}

async function enrichWithAI(structure: ReturnType<typeof parseExcelToStructure>) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return structure;

  // Ask IA to extract villes for each line
  const linesPayload = structure.rubriques.flatMap((r, ri) =>
    r.lignes.map((l, li) => ({ ri, li, libelle: l.libelle, justif: r.justification }))
  );
  if (linesPayload.length === 0) return structure;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu extrais les villes mentionnées dans des lignes budgétaires d'un projet ONG au Niger. Villes possibles : Niamey, Maradi, Dosso, Zinder, Agadez, Tahoua, Tillabéri, Diffa. Renvoie un tableau d'objets {ri, li, villes:[]}. Si aucune ville détectée, renvoie []." },
          { role: "user", content: JSON.stringify(linesPayload) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_villes",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  items: { type: "object", properties: { ri: { type: "number" }, li: { type: "number" }, villes: { type: "array", items: { type: "string" } } }, required: ["ri", "li", "villes"] },
                },
              },
              required: ["items"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_villes" } },
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (args) {
        const parsed = JSON.parse(args);
        for (const item of parsed.items || []) {
          const line = structure.rubriques[item.ri]?.lignes[item.li];
          if (line) (line as any).villes = item.villes;
        }
      }
    }
  } catch (e) {
    console.error("AI enrichment failed:", e);
  }
  return structure;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } }
    );
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { project_id, file_path, file_url, file_name, taux_change_xof } = body;
    if (!project_id || (!file_path && !file_url)) {
      return new Response(JSON.stringify({ error: "project_id et file_path requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Download via service-role storage API (bucket is private)
    let buf: ArrayBuffer;
    if (file_path) {
      const { data: blob, error: dlErr } = await supabase.storage.from("kpt-files").download(file_path);
      if (dlErr || !blob) throw new Error(`Impossible de télécharger le fichier: ${dlErr?.message || "inconnu"}`);
      buf = await blob.arrayBuffer();
    } else {
      const fileRes = await fetch(file_url);
      if (!fileRes.ok) throw new Error("Impossible de télécharger le fichier");
      buf = await fileRes.arrayBuffer();
    }

    // Parse + enrich
    const structure = parseExcelToStructure(buf);
    if (structure.rubriques.length === 0) {
      return new Response(
        JSON.stringify({ error: "Format de fichier non reconnu — vérifiez qu'il s'agit du modèle AEIF Budget Form (rubriques numérotées en colonne A, descriptions en colonne B)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    await enrichWithAI(structure);

    // Insert budget
    const { data: budget, error: bErr } = await supabase
      .from("budgets")
      .insert({
        project_id,
        nom: structure.meta.project_title || file_name || "Budget importé",
        devise: structure.meta.devise,
        taux_change_xof: taux_change_xof || 600,
        montant_total: structure.meta.total,
        montant_cost_share: structure.meta.total_cost_share,
        source_file_url: file_path || file_url,
        source_file_name: file_name,
        source_raw: structure.raw.slice(0, 200),
        status: "draft",
        imported_at: new Date().toISOString(),
        created_by: user.id,
      })
      .select()
      .single();
    if (bErr) throw bErr;

    // Insert categories + lines
    let lineOrder = 0;
    for (let ri = 0; ri < structure.rubriques.length; ri++) {
      const r = structure.rubriques[ri];
      const { data: cat, error: cErr } = await supabase
        .from("budget_categories")
        .insert({
          budget_id: budget.id,
          parent_id: null,
          code: r.code,
          libelle: r.libelle,
          niveau: "rubrique",
          montant_prevu: r.subtotal,
          ordre: ri,
        })
        .select()
        .single();
      if (cErr) throw cErr;

      for (let li = 0; li < r.lignes.length; li++) {
        const l = r.lignes[li];
        await supabase.from("budget_lines").insert({
          budget_id: budget.id,
          category_id: cat.id,
          libelle: l.libelle,
          description: r.justification,
          cost_unitaire: l.cost_unitaire,
          quantite: l.quantite,
          montant_prevu: l.montant_prevu,
          cost_share: l.cost_share,
          villes: (l as any).villes || [],
          justification: r.justification,
          source_row: l.source_row,
          ordre: lineOrder++,
        });
      }
    }

    return new Response(JSON.stringify({ budget_id: budget.id, rubriques: structure.rubriques.length, lines: lineOrder }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("import-budget error:", e);
    return new Response(JSON.stringify({ error: e.message || "Erreur inconnue" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
