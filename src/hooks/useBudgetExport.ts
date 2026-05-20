import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { generateBudgetPDF, generateBudgetXLSX, type BudgetExportData } from "@/lib/budgetExport";

async function loadExportData(budgetId: string): Promise<BudgetExportData> {
  const [budgetRes, catsRes, linesRes, consRes, allocsRes] = await Promise.all([
    supabase.from("budgets").select("*, projects(nom, id)").eq("id", budgetId).single(),
    supabase.from("budget_categories").select("*").eq("budget_id", budgetId).order("ordre"),
    supabase.from("budget_lines").select("*").eq("budget_id", budgetId).order("ordre"),
    supabase.from("v_budget_line_consumption").select("*").eq("budget_id", budgetId),
    supabase
      .from("payment_budget_allocations")
      .select("id, budget_line_id, montant_alloue, montant_alloue_devise_budget, source, confidence, budget_id, payments(reference, date_paiement, beneficiaire_nom, motif, devise, montant, project_id)")
      .eq("budget_id", budgetId),
  ]);
  if (budgetRes.error) throw budgetRes.error;
  const budget = budgetRes.data as any;
  const projectId = budget.project_id;
  // Load unallocated payments for the programme
  const allocPaymentIds = new Set((allocsRes.data || []).map((a: any) => a.payments?.reference).filter(Boolean));
  const { data: paymentsForProject } = await supabase
    .from("payments")
    .select("id, reference, date_paiement, beneficiaire_nom, motif, montant, devise, project_id, projects(parent_id)")
    .order("date_paiement", { ascending: false })
    .limit(2000);
  const allocatedIds = new Set((allocsRes.data || []).map((a: any) => a.payments?.reference));
  const unallocated = (paymentsForProject || [])
    .filter((p: any) => !allocatedIds.has(p.reference))
    .filter((p: any) => p.project_id === projectId || (p.projects?.parent_id === projectId))
    .slice(0, 200)
    .map((p: any) => ({ reference: p.reference, date_paiement: p.date_paiement, beneficiaire_nom: p.beneficiaire_nom, motif: p.motif, montant: p.montant, devise: p.devise }));

  return {
    budget: {
      nom: budget.nom, devise: budget.devise, taux_change_xof: Number(budget.taux_change_xof),
      montant_total: Number(budget.montant_total), status: budget.status, project_nom: budget.projects?.nom,
    },
    categories: (catsRes.data || []).map((c: any) => ({ id: c.id, code: c.code, libelle: c.libelle, montant_prevu: Number(c.montant_prevu), ordre: c.ordre })),
    lines: (linesRes.data || []).map((l: any) => ({ id: l.id, category_id: l.category_id, libelle: l.libelle, montant_prevu: Number(l.montant_prevu), villes: l.villes })),
    consumption: (consRes.data || []).map((c: any) => ({ budget_line_id: c.budget_line_id, montant_consomme: Number(c.montant_consomme || 0), pct_consomme: Number(c.pct_consomme || 0) })),
    allocations: (allocsRes.data || []).map((a: any) => ({
      id: a.id, budget_line_id: a.budget_line_id, montant_alloue: Number(a.montant_alloue),
      montant_alloue_devise_budget: a.montant_alloue_devise_budget != null ? Number(a.montant_alloue_devise_budget) : null,
      source: a.source, confidence: a.confidence != null ? Number(a.confidence) : null,
      payment: a.payments || { reference: "", date_paiement: "", beneficiaire_nom: "", motif: "", devise: "", montant: 0 },
    })),
    unallocated,
  };
}

export function useBudgetExport() {
  const { toast } = useToast();
  const exportPDF = useMutation({
    mutationFn: async (budgetId: string) => {
      const data = await loadExportData(budgetId);
      const doc = generateBudgetPDF(data);
      doc.save(`Budget-${data.budget.nom.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().slice(0, 10)}.pdf`);
    },
    onError: (e: any) => toast({ title: "Erreur export PDF", description: e.message, variant: "destructive" }),
  });
  const exportXLSX = useMutation({
    mutationFn: async (budgetId: string) => {
      const data = await loadExportData(budgetId);
      const buf = generateBudgetXLSX(data);
      const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `Budget-${data.budget.nom.replace(/[^a-z0-9]/gi, "_")}-${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    },
    onError: (e: any) => toast({ title: "Erreur export Excel", description: e.message, variant: "destructive" }),
  });
  return { exportPDF: exportPDF.mutateAsync, exportXLSX: exportXLSX.mutateAsync, isExporting: exportPDF.isPending || exportXLSX.isPending };
}