import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Loader2, Receipt, Trash2 } from "lucide-react";
import { useProject, useProjects } from "@/hooks/useProjects";
import { usePayments } from "@/hooks/usePayments";
import { StatusBadge } from "@/components/StatusBadge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ProjetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading } = useProject(id);
  const { deleteProject } = useProjects();
  const { payments } = usePayments();

  const projectPayments = payments.filter((p) => p.project_id === id);
  const totalDepenses = projectPayments.reduce((sum, p) => sum + Number(p.montant), 0);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!project) return <div className="text-center py-12 text-muted-foreground">Projet introuvable</div>;

  const handleDelete = async () => {
    await deleteProject(project.id);
    navigate("/projets");
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projets")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{project.nom}</h1>
            <StatusBadge status={project.statut} />
          </div>
          <p className="text-muted-foreground text-sm font-mono">{project.code}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/projets/${id}/modifier`)}>
          <Edit className="h-4 w-4 mr-1" /> Modifier
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce projet ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Budget</p><p className="text-xl font-bold">{Number(project.budget_previsionnel).toLocaleString("fr-FR")} XOF</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Dépensé</p><p className="text-xl font-bold">{totalDepenses.toLocaleString("fr-FR")} XOF</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Reste</p><p className="text-xl font-bold">{(Number(project.budget_previsionnel) - totalDepenses).toLocaleString("fr-FR")} XOF</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Paiements</p><p className="text-xl font-bold">{projectPayments.length}</p></CardContent></Card>
      </div>

      {project.description && (
        <Card><CardHeader><CardTitle className="text-lg">Description</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{project.description}</p></CardContent></Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Paiements liés</CardTitle>
          <Button size="sm" onClick={() => navigate(`/paiements/nouveau?project=${id}`)}><Receipt className="h-4 w-4 mr-1" /> Nouveau</Button>
        </CardHeader>
        <CardContent>
          {projectPayments.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground text-sm">Aucun paiement lié à ce projet</p>
          ) : (
            <div className="space-y-2">
              {projectPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => navigate(`/paiements/${p.id}`)}>
                  <div>
                    <p className="font-medium text-sm">{p.beneficiaire_nom}</p>
                    <p className="text-xs text-muted-foreground">{p.reference} · {p.date_paiement}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{Number(p.montant).toLocaleString("fr-FR")} {p.devise}</p>
                    <StatusBadge status={p.statut} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
