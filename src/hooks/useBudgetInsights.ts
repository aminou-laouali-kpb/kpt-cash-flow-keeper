import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Insights = {
  synthese: string;
  alertes: { ligne: string; ligne_id: string; pct_consomme: number; depassement: number; suggestions: { ligne_donneuse: string; ligne_donneuse_id: string; montant_suggere: number; raison: string }[] }[];
  recommandations: { ligne: string; ligne_id: string; reste: number; idees: string[] }[];
};

export function useBudgetInsights(budgetId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["budget_insights", budgetId],
    queryFn: async () => {
      if (!budgetId) return null;
      const { data } = await supabase
        .from("budget_insights")
        .select("*")
        .eq("budget_id", budgetId)
        .order("generated_at", { ascending: false })
        .limit(1);
      return (data && data[0]) || null;
    },
    enabled: !!budgetId,
  });

  const generate = useMutation({
    mutationFn: async (budget_id: string) => {
      const { data, error } = await supabase.functions.invoke("budget-insights", { body: { budget_id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budget_insights"] }); toast({ title: "Analyse IA générée" }); },
    onError: (e: any) => toast({ title: "Erreur IA", description: e.message, variant: "destructive" }),
  });

  return {
    insights: (query.data?.insights as Insights | null) || null,
    generatedAt: query.data?.generated_at as string | undefined,
    isLoading: query.isLoading,
    generate: generate.mutateAsync,
    isGenerating: generate.isPending,
  };
}