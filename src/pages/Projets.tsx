import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useProjects } from "@/hooks/useProjects";
import { StatusBadge } from "@/components/StatusBadge";

export default function Projets() {
  const navigate = useNavigate();
  const { projects, isLoading } = useProjects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projets</h1>
          <p className="text-muted-foreground mt-1">Gérez vos projets et leurs dépenses</p>
        </div>
        <Button className="h-11" onClick={() => navigate("/projets/nouveau")}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau projet
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FolderKanban className="h-12 w-12 mb-3 opacity-30" />
              <p>Aucun projet pour le moment</p>
              <Button variant="link" onClick={() => navigate("/projets/nouveau")} className="mt-2">
                Créer votre premier projet
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/projets/${project.id}`)}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{project.nom}</CardTitle>
                  <StatusBadge status={project.statut} />
                </div>
                <p className="text-xs text-muted-foreground font-mono">{project.code}</p>
              </CardHeader>
              <CardContent>
                {project.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{project.description}</p>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Budget</span>
                  <span className="font-medium">{Number(project.budget_previsionnel).toLocaleString("fr-FR")} XOF</span>
                </div>
                {project.responsable && (
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-muted-foreground">Responsable</span>
                    <span>{project.responsable}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
