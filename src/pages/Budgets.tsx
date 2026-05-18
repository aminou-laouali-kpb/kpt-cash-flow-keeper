import { useNavigate } from "react-router-dom";
import { useBudgets } from "@/hooks/useBudgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Wallet, Upload } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Budgets() {
  const navigate = useNavigate();
  const { budgets, isLoading } = useBudgets();

  const { data: projects } = useQuery({
    queryKey: ["projects-with-budgets"],
    queryFn: async () => {
      const { data } = await supabase.from("projects").select("id, nom, type_projet");
      return data || [];
    },
  });

  const projectMap = new Map((projects || []).map((p: any) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" /> Budgets
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Importez et suivez les budgets bailleurs ligne par ligne.
          </p>
        </div>
        <Button onClick={() => navigate("/budgets/nouveau")}>
          <Upload className="h-4 w-4 mr-2" /> Importer un budget
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">Aucun budget importé</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Importez un fichier Excel bailleur pour activer le suivi intelligent et la déduction automatique des dépenses.
            </p>
            <Button onClick={() => navigate("/budgets/nouveau")}>
              <Plus className="h-4 w-4 mr-2" /> Importer mon premier budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {budgets.map((b) => {
            const p: any = projectMap.get(b.project_id);
            return (
              <Card
                key={b.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/budgets/${b.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{b.nom}</CardTitle>
                      {p && (
                        <p className="text-xs text-muted-foreground mt-1">Programme : {p.nom}</p>
                      )}
                    </div>
                    <Badge variant={b.status === "active" ? "default" : "secondary"}>
                      {b.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="font-semibold">
                      {Number(b.montant_total).toLocaleString("fr-FR")} {b.devise}
                    </span>
                    {b.devise !== "XOF" && (
                      <span className="text-xs text-muted-foreground">
                        1 {b.devise} ≈ {Number(b.taux_change_xof).toLocaleString("fr-FR")} XOF
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}