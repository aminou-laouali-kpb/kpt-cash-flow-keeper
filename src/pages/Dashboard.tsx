import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Upload, FolderPlus, Receipt, FileText, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePayments } from "@/hooks/usePayments";
import { useProjects } from "@/hooks/useProjects";
import { StatusBadge } from "@/components/StatusBadge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["hsl(215,70%,45%)", "hsl(160,45%,45%)", "hsl(38,92%,50%)", "hsl(0,72%,51%)", "hsl(270,60%,50%)", "hsl(190,70%,50%)"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { payments, isLoading: loadingPayments } = usePayments();
  const { projects, isLoading: loadingProjects } = useProjects();

  const isLoading = loadingPayments || loadingProjects;

  const now = new Date();
  const thisMonth = payments.filter((p) => {
    const d = new Date(p.date_paiement);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalMontant = payments.reduce((s, p) => s + Number(p.montant), 0);
  const monthMontant = thisMonth.reduce((s, p) => s + Number(p.montant), 0);
  const signes = payments.filter((p) => p.statut === "signe").length;
  const brouillons = payments.filter((p) => p.statut === "brouillon").length;
  const aResigner = payments.filter((p) => p.statut === "a_re_signer").length;

  const stats = [
    { label: "Total paiements", value: payments.length.toString(), icon: Receipt, color: "text-primary" },
    { label: "Fiches signées", value: signes.toString(), icon: CheckCircle2, color: "text-secondary" },
    { label: "En brouillon", value: brouillons.toString(), icon: FileText, color: "text-muted-foreground" },
    { label: "À re-signer", value: aResigner.toString(), icon: Clock, color: "text-warning" },
  ];

  // Chart data by project
  const chartData = projects.map((proj) => {
    const total = payments.filter((p) => p.project_id === proj.id).reduce((s, p) => s + Number(p.montant), 0);
    return { name: proj.nom.length > 15 ? proj.nom.slice(0, 15) + "…" : proj.nom, montant: total };
  }).filter((d) => d.montant > 0);

  const recentPayments = payments.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Tableau de bord</h1>
        <p className="text-muted-foreground mt-1">Vue d'ensemble de la comptabilité KPT</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={() => navigate("/paiements/nouveau")} className="h-11"><Plus className="h-4 w-4 mr-2" />Nouveau paiement</Button>
        <Button variant="outline" onClick={() => navigate("/paiements/nouveau?type=recu")} className="h-11"><Upload className="h-4 w-4 mr-2" />Importer un reçu</Button>
        <Button variant="outline" onClick={() => navigate("/projets/nouveau")} className="h-11"><FolderPlus className="h-4 w-4 mr-2" />Nouveau projet</Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </CardHeader>
                <CardContent><div className="text-3xl font-bold text-foreground">{stat.value}</div></CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle className="text-lg">Montants</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total dépensé</span><span className="font-bold text-lg">{totalMontant.toLocaleString("fr-FR")} XOF</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Ce mois</span><span className="font-bold text-lg">{monthMontant.toLocaleString("fr-FR")} XOF</span></div>
                </div>
              </CardContent>
            </Card>

            {chartData.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-lg">Dépenses par projet</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v: number) => v.toLocaleString("fr-FR") + " XOF"} />
                      <Bar dataKey="montant" radius={[4, 4, 0, 0]}>
                        {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader><CardTitle className="text-lg">Dernières transactions</CardTitle></CardHeader>
            <CardContent>
              {recentPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Receipt className="h-12 w-12 mb-3 opacity-30" />
                  <p>Aucune transaction pour le moment</p>
                  <Button variant="link" onClick={() => navigate("/paiements/nouveau")} className="mt-2">Créer votre premier paiement</Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentPayments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted" onClick={() => navigate(`/paiements/${p.id}`)}>
                      <div>
                        <p className="font-medium text-sm">{p.beneficiaire_nom}</p>
                        <p className="text-xs text-muted-foreground">{p.reference} · {p.date_paiement}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{Number(p.montant).toLocaleString("fr-FR")} {p.devise}</p>
                        <StatusBadge status={p.statut} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
