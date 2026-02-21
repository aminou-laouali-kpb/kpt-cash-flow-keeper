import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Plus } from "lucide-react";

export default function Paiements() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Paiements</h1>
          <p className="text-muted-foreground mt-1">Liste des paiements et fiches</p>
        </div>
        <Button className="h-11">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau paiement
        </Button>
      </div>

      <Card className="border-border">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mb-3 opacity-30" />
            <p>Aucun paiement pour le moment</p>
            <p className="text-sm">Les paiements seront disponibles dans la Phase 5</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
