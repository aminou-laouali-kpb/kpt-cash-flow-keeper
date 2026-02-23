import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type PaymentSignature = {
  id: string;
  payment_id: string;
  signer_type: "president" | "tresoriere" | "beneficiaire";
  signer_name: string | null;
  signature_image_url: string | null;
  signed_at: string | null;
  ip_address: string | null;
  is_valid: boolean;
  created_at: string;
};

export type SignatureRequest = {
  id: string;
  payment_id: string;
  token: string;
  status: "pending" | "signed" | "refused" | "expired";
  sent_via: string | null;
  refusal_reason: string | null;
  created_at: string;
  expires_at: string;
  signed_at: string | null;
};

export function usePaymentSignatures(paymentId: string | undefined) {
  return useQuery({
    queryKey: ["payment_signatures", paymentId],
    queryFn: async () => {
      if (!paymentId) return [];
      const { data, error } = await supabase
        .from("payment_signatures")
        .select("*")
        .eq("payment_id", paymentId)
        .order("created_at");
      if (error) throw error;
      return data as PaymentSignature[];
    },
    enabled: !!paymentId,
  });
}

export function useSignatureRequests(paymentId: string | undefined) {
  return useQuery({
    queryKey: ["signature_requests", paymentId],
    queryFn: async () => {
      if (!paymentId) return [];
      const { data, error } = await supabase
        .from("signature_requests")
        .select("*")
        .eq("payment_id", paymentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SignatureRequest[];
    },
    enabled: !!paymentId,
  });
}

export function useSignatureByToken(token: string | undefined) {
  return useQuery({
    queryKey: ["signature_request_token", token],
    queryFn: async () => {
      if (!token) return null;
      const { data, error } = await supabase
        .from("signature_requests")
        .select("*, payments(*, projects(nom))")
        .eq("token", token)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });
}

export function useSignatureActions() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createSignature = useMutation({
    mutationFn: async (input: {
      payment_id: string;
      signer_type: "president" | "tresoriere" | "beneficiaire";
      signer_name: string;
      signature_image_url: string;
    }) => {
      const { data, error } = await supabase
        .from("payment_signatures")
        .insert({
          ...input,
          signed_at: new Date().toISOString(),
          is_valid: true,
        })
        .select()
        .single();
      if (error) throw error;

      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["payment_signatures", vars.payment_id] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
      toast({ title: "Signature enregistrée" });
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const createSignatureRequest = useMutation({
    mutationFn: async (input: { payment_id: string; sent_via: string }) => {
      // Update payment status to en_attente_signature
      await supabase
        .from("payments")
        .update({ statut: "en_attente_signature" as any })
        .eq("id", input.payment_id);

      const { data, error } = await supabase
        .from("signature_requests")
        .insert({
          payment_id: input.payment_id,
          sent_via: input.sent_via,
        })
        .select()
        .single();
      if (error) throw error;
      return data as SignatureRequest;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["signature_requests", vars.payment_id] });
      queryClient.invalidateQueries({ queryKey: ["payments"] });
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const signViaToken = useMutation({
    mutationFn: async (input: {
      token: string;
      payment_id: string;
      signer_name: string;
      signature_image_url: string;
    }) => {
      // Insert signature
      const { error: sigError } = await supabase
        .from("payment_signatures")
        .insert({
          payment_id: input.payment_id,
          signer_type: "beneficiaire" as any,
          signer_name: input.signer_name,
          signature_image_url: input.signature_image_url,
          signed_at: new Date().toISOString(),
          is_valid: true,
        });
      if (sigError) throw sigError;

      // Update request
      const { error: reqError } = await supabase
        .from("signature_requests")
        .update({ status: "signed" as any, signed_at: new Date().toISOString() })
        .eq("token", input.token);
      if (reqError) throw reqError;
    },
    onSuccess: () => {
      toast({ title: "Signature enregistrée avec succès" });
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const refuseViaToken = useMutation({
    mutationFn: async (input: { token: string; reason: string }) => {
      const { error } = await supabase
        .from("signature_requests")
        .update({ status: "refused" as any, refusal_reason: input.reason })
        .eq("token", input.token);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Signature refusée" });
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return {
    createSignature: createSignature.mutateAsync,
    createSignatureRequest: createSignatureRequest.mutateAsync,
    signViaToken: signViaToken.mutateAsync,
    refuseViaToken: refuseViaToken.mutateAsync,
    isCreating: createSignature.isPending,
    isCreatingRequest: createSignatureRequest.isPending,
  };
}
