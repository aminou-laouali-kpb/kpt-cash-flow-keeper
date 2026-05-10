import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useProjects, useProject } from "@/hooks/useProjects";

const schema = z.object({
  nom: z.string().min(1, "Requis").max(200),
  code: z.string().min(1, "Requis").max(20),
  description: z.string().max(1000).optional().or(z.literal("")),
  date_debut: z.string().optional().or(z.literal("")),
  date_fin: z.string().optional().or(z.literal("")),
  responsable: z.string().max(200).optional().or(z.literal("")),
  budget_previsionnel: z.coerce.number().min(0).default(0),
  statut: z.enum(["actif", "cloture"]).default("actif"),
  type_projet: z.enum(["programme", "site", "standard"]).default("standard"),
  parent_id: z.string().optional().or(z.literal("")),
  ville: z.string().max(100).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function ProjetForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { data: project, isLoading: loadingProject } = useProject(id);
  const { createProject, updateProject, projects } = useProjects();
  const programmes = projects.filter((p) => p.type_projet === "programme" && p.id !== id);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { nom: "", code: "", description: "", date_debut: "", date_fin: "", responsable: "", budget_previsionnel: 0, statut: "actif", type_projet: "standard", parent_id: "", ville: "" },
  });

  useEffect(() => {
    if (project) {
      form.reset({
        nom: project.nom,
        code: project.code,
        description: project.description || "",
        date_debut: project.date_debut || "",
        date_fin: project.date_fin || "",
        responsable: project.responsable || "",
        budget_previsionnel: Number(project.budget_previsionnel),
        statut: project.statut,
        type_projet: project.type_projet || "standard",
        parent_id: project.parent_id || "",
        ville: project.ville || "",
      });
    }
  }, [project, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      const parent = values.parent_id && values.parent_id !== "__none__" ? values.parent_id : null;
      const payload: any = { ...values, parent_id: parent, ville: values.ville || null };
      if (isEditing) {
        await updateProject({ id, ...payload });
      } else {
        await createProject(payload);
      }
      navigate("/projets");
    } catch {}
  };

  if (isEditing && loadingProject) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projets")}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{isEditing ? "Modifier le projet" : "Nouveau projet"}</h1>
          <p className="text-muted-foreground mt-1">{isEditing ? "Mettre à jour les informations" : "Créer un nouveau projet"}</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Informations du projet</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="nom" render={({ field }) => (
                  <FormItem><FormLabel>Nom du projet *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="code" render={({ field }) => (
                  <FormItem><FormLabel>Code *</FormLabel><FormControl><Input placeholder="ex: PROJ-001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="date_debut" render={({ field }) => (
                  <FormItem><FormLabel>Date début</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="date_fin" render={({ field }) => (
                  <FormItem><FormLabel>Date fin</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="responsable" render={({ field }) => (
                  <FormItem><FormLabel>Responsable</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="budget_previsionnel" render={({ field }) => (
                  <FormItem><FormLabel>Budget prévisionnel (XOF)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField control={form.control} name="type_projet" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="standard">Projet standard</SelectItem>
                        <SelectItem value="programme">Programme (parent)</SelectItem>
                        <SelectItem value="site">Site / Ville (enfant)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="parent_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Programme parent</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || "__none__"}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Aucun" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="__none__">Aucun</SelectItem>
                        {programmes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ville" render={({ field }) => (
                  <FormItem><FormLabel>Ville</FormLabel><FormControl><Input placeholder="ex: Niamey" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              {isEditing && (
                <FormField control={form.control} name="statut" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Statut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="actif">Actif</SelectItem>
                        <SelectItem value="cloture">Clôturé</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/projets")}>Annuler</Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {isEditing ? "Mettre à jour" : "Créer le projet"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
