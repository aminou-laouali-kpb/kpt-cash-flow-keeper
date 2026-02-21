import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type Payment = {
  id: string;
  reference: string;
  type: "recu_importe" | "fiche_manuelle";
  project_id: string | null;
  date_paiement: string;
  montant: number;
  devise: string;
  categorie: string;
  mode_paiement: string;
  beneficiaire_nom: string;
  beneficiaire_telephone: string | null;
  beneficiaire_email: string | null;
  beneficiaire_adresse: string | null;
  beneficiaire_piece_type: string | null;
  beneficiaire_piece_numero: string | null;
  motif: string;
  lieu: string | null;
  reference_transaction: string | null;
  commentaire: string | null;
  personne_effectuant: string | null;
  motif_absence_recu: string | null;
  autorisation_reference: string | null;
  statut: "brouillon" | "en_attente_signature" | "signe" | "a_re_signer";
  version_courante: number;
  created_by: string;
  created_at: string;
  updated_at: string;
  // joined
  projects?: { nom: string } | null;
};

export type PaymentInput = {
  type: "recu_importe" | "fiche_manuelle";
  project_id?: string;
  date_paiement: string;
  montant: number;
  devise?: string;
  categorie: string;
  mode_paiement: string;
  beneficiaire_nom: string;
  beneficiaire_telephone?: string;
  beneficiaire_email?: string;
  beneficiaire_adresse?: string;
  beneficiaire_piece_type?: string;
  beneficiaire_piece_numero?: string;
  motif: string;
  lieu?: string;
  reference_transaction?: string;
  commentaire?: string;
  personne_effectuant?: string;
  motif_absence_recu?: string;
  autorisation_reference?: string;
};

export function usePayments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["payments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, projects(nom)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Payment[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: PaymentInput) => {
      // Generate reference
      const { data: refData, error: refError } = await supabase.rpc("generate_payment_reference");
      if (refError) throw refError;

      const { data, error } = await supabase
        .from("payments")
        .insert({
          ...input,
          reference: refData as string,
          created_by: user!.id,
        } as any)
        .select("*, projects(nom)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Paiement créé avec succès" });
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: Partial<PaymentInput> & { id: string }) => {
      const { data, error } = await supabase
        .from("payments")
        .update(input as any)
        .eq("id", id)
        .select("*, projects(nom)")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Paiement mis à jour" });
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Paiement supprimé" });
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return {
    payments: query.data || [],
    isLoading: query.isLoading,
    createPayment: createMutation.mutateAsync,
    updatePayment: updateMutation.mutateAsync,
    deletePayment: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
  };
}

export function usePayment(id: string | undefined) {
  return useQuery({
    queryKey: ["payments", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("payments")
        .select("*, projects(nom)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Payment;
    },
    enabled: !!id,
  });
}
