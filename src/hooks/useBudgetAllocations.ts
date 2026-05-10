import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Allocation = {
  id: string;
  payment_id: string;
  budget_line_id: string;
  montant_alloue: number;
  montant_alloue_devise_budget: number | null;
  confidence: number | null;
  source: string;
  reasoning: string | null;
  validated_by: string | null;
  validated_at: string | null;
  created_at: string;
};

export function usePaymentAllocations(paymentId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["payment_allocations", paymentId],
    queryFn: async () => {
      if (!paymentId) return [];
      const { data, error } = await supabase
        .from("payment_budget_allocations")
        .select("*, budget_lines(id, libelle, budget_id, budgets(nom, devise))")
        .eq("payment_id", paymentId);
      if (error) throw error;
      return data || [];
    },
    enabled: !!paymentId,
  });

  const suggest = useMutation({
    mutationFn: async (paymentId: string) => {
      const { data, error } = await supabase.functions.invoke("categorize-expense", {
        body: { payment_id: paymentId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { suggestion: any; message?: string };
    },
    onError: (e: any) => toast({ title: "Erreur IA", description: e.message, variant: "destructive" }),
  });

  const create = useMutation({
    mutationFn: async (input: {
      payment_id: string;
      budget_line_id: string;
      montant_alloue: number;
      montant_alloue_devise_budget?: number;
      confidence?: number;
      source?: string;
      reasoning?: string;
      validated?: boolean;
    }) => {
      const payload: any = {
        payment_id: input.payment_id,
        budget_line_id: input.budget_line_id,
        montant_alloue: input.montant_alloue,
        montant_alloue_devise_budget: input.montant_alloue_devise_budget,
        confidence: input.confidence ?? 1,
        source: input.source || "manual",
        reasoning: input.reasoning,
      };
      if (input.validated) {
        const { data: u } = await supabase.auth.getUser();
        payload.validated_by = u.user?.id;
        payload.validated_at = new Date().toISOString();
      }
      const { data, error } = await supabase.from("payment_budget_allocations").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_allocations", paymentId] });
      qc.invalidateQueries({ queryKey: ["budgets", "consumption"] });
      toast({ title: "Imputation enregistrée" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const validate = useMutation({
    mutationFn: async (id: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("payment_budget_allocations")
        .update({ validated_by: u.user?.id, validated_at: new Date().toISOString(), confidence: 1, source: "validated" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_allocations", paymentId] });
      toast({ title: "Imputation validée" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_budget_allocations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["payment_allocations", paymentId] });
      qc.invalidateQueries({ queryKey: ["budgets", "consumption"] });
      toast({ title: "Imputation supprimée" });
    },
  });

  return {
    allocations: query.data || [],
    isLoading: query.isLoading,
    suggest: suggest.mutateAsync,
    isSuggesting: suggest.isPending,
    createAllocation: create.mutateAsync,
    validateAllocation: validate.mutateAsync,
    deleteAllocation: remove.mutateAsync,
  };
}