import { Card, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function Parametres() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de l'association KPT</p>
      </div>

      <Card className="border-border">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Settings className="h-12 w-12 mb-3 opacity-30" />
            <p>Page paramètres</p>
            <p className="text-sm">Disponible dans la Phase 2</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
