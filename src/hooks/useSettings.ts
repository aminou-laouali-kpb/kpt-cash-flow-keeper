import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type Settings = {
  id: string;
  nom: string;
  adresse: string | null;
  telephone: string | null;
  email: string | null;
  logo_url: string | null;
  president_nom: string | null;
  president_fonction: string | null;
  president_signature_url: string | null;
  tresoriere_nom: string | null;
  tresoriere_fonction: string | null;
  tresoriere_signature_url: string | null;
  devise_defaut: string;
  prefixe_numerotation: string;
  mention_legale: string | null;
  prochain_numero: number;
};

export function useSettings() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings_association")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("settings_association")
          .insert({ nom: "Karaté Pour Tous (KPT)" })
          .select()
          .single();
        if (insertError) throw insertError;
        return newData as Settings;
      }

      return data as Settings;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<Settings>) => {
      const id = query.data?.id;
      if (!id) throw new Error("No settings found");
      const { data, error } = await supabase
        .from("settings_association")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Paramètres sauvegardés" });
    },
    onError: (error) => {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    },
  });

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${path}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kpt-files").upload(fileName, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("kpt-files").getPublicUrl(fileName);
    return data.publicUrl;
  };

  return {
    settings: query.data,
    isLoading: query.isLoading,
    updateSettings: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    uploadFile,
  };
}
