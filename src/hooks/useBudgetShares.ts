import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ShareLink = {
  id: string; budget_id: string; token: string; expires_at: string | null;
  allow_export: boolean; view_count: number; revoked_at: string | null;
  created_by: string; created_at: string; label: string | null;
};

export function useBudgetShares(budgetId: string | undefined) {
  const qc = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["budget_share_links", budgetId],
    queryFn: async () => {
      if (!budgetId) return [];
      const { data, error } = await supabase
        .from("budget_share_links")
        .select("*")
        .eq("budget_id", budgetId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ShareLink[];
    },
    enabled: !!budgetId,
  });

  const createLink = useMutation({
    mutationFn: async (input: { budget_id: string; days: number | null; allow_export: boolean; label?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Non connecté");
      const expires = input.days != null ? new Date(Date.now() + input.days * 86400000).toISOString() : null;
      const { data, error } = await supabase.from("budget_share_links").insert({
        budget_id: input.budget_id, expires_at: expires, allow_export: input.allow_export,
        label: input.label || null, created_by: u.user.id,
      }).select("*").single();
      if (error) throw error;
      return data as ShareLink;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budget_share_links"] }); toast({ title: "Lien créé" }); },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const revokeLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budget_share_links").update({ revoked_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["budget_share_links"] }); toast({ title: "Lien révoqué" }); },
  });

  return { links: query.data || [], isLoading: query.isLoading, createLink: createLink.mutateAsync, revokeLink: revokeLink.mutateAsync };
}