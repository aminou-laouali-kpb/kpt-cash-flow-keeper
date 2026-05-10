import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Budget = {
  id: string;
  project_id: string;
  nom: string;
  devise: string;
  taux_change_xof: number;
  montant_total: number;
  montant_cost_share: number;
  source_file_url: string | null;
  source_file_name: string | null;
  source_raw: any;
  status: "draft" | "active" | "archived";
  imported_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type BudgetCategory = {
  id: string;
  budget_id: string;
  parent_id: string | null;
  code: string | null;
  libelle: string;
  niveau: "rubrique" | "sous_categorie";
  montant_prevu: number;
  ordre: number;
};

export type BudgetLine = {
  id: string;
  budget_id: string;
  category_id: string | null;
  libelle: string;
  description: string | null;
  cost_unitaire: number | null;
  quantite: number | null;
  montant_prevu: number;
  cost_share: number;
  villes: string[] | null;
  justification: string | null;
  source_row: number | null;
  ordre: number;
};

export function useBudgets(projectId?: string) {
  const query = useQuery({
    queryKey: ["budgets", projectId],
    queryFn: async () => {
      let q = supabase.from("budgets").select("*").order("created_at", { ascending: false });
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as Budget[];
    },
  });
  return { budgets: query.data || [], isLoading: query.isLoading };
}

export function useBudget(id: string | undefined) {
  return useQuery({
    queryKey: ["budgets", "single", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("budgets").select("*, projects(nom)").eq("id", id).single();
      if (error) throw error;
      return data as Budget & { projects?: { nom: string } };
    },
    enabled: !!id,
  });
}

export function useBudgetTree(budgetId: string | undefined) {
  return useQuery({
    queryKey: ["budgets", "tree", budgetId],
    queryFn: async () => {
      if (!budgetId) return { categories: [], lines: [] };
      const [cats, lines] = await Promise.all([
        supabase.from("budget_categories").select("*").eq("budget_id", budgetId).order("ordre"),
        supabase.from("budget_lines").select("*").eq("budget_id", budgetId).order("ordre"),
      ]);
      if (cats.error) throw cats.error;
      if (lines.error) throw lines.error;
      return { categories: (cats.data || []) as BudgetCategory[], lines: (lines.data || []) as BudgetLine[] };
    },
    enabled: !!budgetId,
  });
}

export function useBudgetActions() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const activateBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").update({ status: "active" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Budget activé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteBudget = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["budgets"] });
      toast({ title: "Budget supprimé" });
    },
  });

  return { activateBudget: activateBudget.mutateAsync, deleteBudget: deleteBudget.mutateAsync };
}

export function useBudgetConsumption(budgetId: string | undefined) {
  return useQuery({
    queryKey: ["budgets", "consumption", budgetId],
    queryFn: async () => {
      if (!budgetId) return [];
      const { data, error } = await supabase.from("v_budget_line_consumption").select("*").eq("budget_id", budgetId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!budgetId,
  });
}
