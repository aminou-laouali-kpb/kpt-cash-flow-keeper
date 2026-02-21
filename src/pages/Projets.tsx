import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, Plus } from "lucide-react";

export default function Projets() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projets</h1>
          <p className="text-muted-foreground mt-1">Gérez vos projets et leurs dépenses</p>
        </div>
        <Button className="h-11">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau projet
        </Button>
      </div>

      <Card className="border-border">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FolderKanban className="h-12 w-12 mb-3 opacity-30" />
            <p>Aucun projet pour le moment</p>
            <p className="text-sm">Les projets seront disponibles dans la Phase 3</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
