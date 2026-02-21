import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Upload, FolderPlus, Receipt, FileText, Clock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const navigate = useNavigate();

  const stats = [
    { label: "Total paiements", value: "0", icon: Receipt, color: "text-primary" },
    { label: "Fiches signées", value: "0", icon: CheckCircle2, color: "text-secondary" },
    { label: "En brouillon", value: "0", icon: FileText, color: "text-muted-foreground" },
    { label: "À re-signer", value: "0", icon: Clock, color: "text-warning" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de la comptabilité KPT</p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate("/paiements/nouveau")} className="h-11">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau paiement
        </Button>
        <Button variant="outline" onClick={() => navigate("/paiements/nouveau?type=recu")} className="h-11">
          <Upload className="h-4 w-4 mr-2" />
          Importer un reçu
        </Button>
        <Button variant="outline" onClick={() => navigate("/projets/nouveau")} className="h-11">
          <FolderPlus className="h-4 w-4 mr-2" />
          Nouveau projet
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent transactions placeholder */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Dernières transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Receipt className="h-12 w-12 mb-3 opacity-30" />
            <p>Aucune transaction pour le moment</p>
            <Button variant="link" onClick={() => navigate("/paiements/nouveau")} className="mt-2">
              Créer votre premier paiement
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
