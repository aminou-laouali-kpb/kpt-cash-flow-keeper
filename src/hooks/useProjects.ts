import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export type Project = {
  id: string;
  nom: string;
  code: string;
  description: string | null;
  date_debut: string | null;
  date_fin: string | null;
  responsable: string | null;
  budget_previsionnel: number;
  statut: "actif" | "cloture";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  parent_id?: string | null;
  ville?: string | null;
  type_projet?: "programme" | "site" | "standard";
};

type ProjectInput = {
  nom: string;
  code: string;
  description?: string;
  date_debut?: string;
  date_fin?: string;
  responsable?: string;
  budget_previsionnel?: number;
  statut?: "actif" | "cloture";
  parent_id?: string | null;
  ville?: string | null;
  type_projet?: "programme" | "site" | "standard";
};

export function useProjects() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: ProjectInput) => {
      const { data, error } = await supabase
        .from("projects")
        .insert({ ...input, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projet créé avec succès" });
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: ProjectInput & { id: string }) => {
      const { data, error } = await supabase
        .from("projects")
        .update(input as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projet mis à jour" });
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Projet supprimé" });
    },
    onError: (e) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
  });

  return {
    projects: query.data || [],
    isLoading: query.isLoading,
    createProject: createMutation.mutateAsync,
    updateProject: updateMutation.mutateAsync,
    deleteProject: deleteMutation.mutateAsync,
  };
}

export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: ["projects", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!id,
  });
}
