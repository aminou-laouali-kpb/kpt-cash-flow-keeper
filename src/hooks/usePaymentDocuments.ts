import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PaymentDocument = {
  id: string;
  payment_id: string;
  file_url: string;
  file_name: string;
  file_type: string | null;
  type_piece: string;
  created_at: string;
};

export function usePaymentDocuments(paymentId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["payment_documents", paymentId],
    queryFn: async () => {
      if (!paymentId) return [] as PaymentDocument[];
      const { data, error } = await supabase
        .from("payment_documents")
        .select("*")
        .eq("payment_id", paymentId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as PaymentDocument[];
    },
    enabled: !!paymentId,
  });

  const addDocument = useMutation({
    mutationFn: async (doc: Omit<PaymentDocument, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("payment_documents")
        .insert(doc as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment_documents", paymentId] });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment_documents", paymentId] });
      toast({ title: "Document supprimé" });
    },
    onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return {
    documents: query.data || [],
    isLoading: query.isLoading,
    addDocument: addDocument.mutateAsync,
    deleteDocument: deleteDocument.mutateAsync,
  };
}