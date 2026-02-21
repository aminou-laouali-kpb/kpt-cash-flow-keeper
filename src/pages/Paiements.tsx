import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Plus, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePayments } from "@/hooks/usePayments";
import { StatusBadge } from "@/components/StatusBadge";

export default function Paiements() {
  const navigate = useNavigate();
  const { payments, isLoading } = usePayments();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Paiements</h1>
          <p className="text-muted-foreground mt-1">Liste des paiements et fiches</p>
        </div>
        <Button className="h-11" onClick={() => navigate("/paiements/nouveau")}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau paiement
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-3 opacity-30" />
              <p>Aucun paiement pour le moment</p>
              <Button variant="link" onClick={() => navigate("/paiements/nouveau")} className="mt-2">
                Créer votre premier paiement
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/paiements/${p.id}`)}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{p.beneficiaire_nom}</p>
                      <StatusBadge status={p.statut} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {p.reference} · {(p as any).projects?.nom || "—"} · {p.date_paiement}
                    </p>
                  </div>
                  <p className="font-bold text-lg">{Number(p.montant).toLocaleString("fr-FR")} {p.devise}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
