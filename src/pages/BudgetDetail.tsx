import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { useBudget, useBudgetTree, useBudgetActions, useBudgetConsumption } from "@/hooks/useBudgets";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function BudgetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: budget, isLoading } = useBudget(id);
  const { data: tree } = useBudgetTree(id);
  const { data: consumption = [] } = useBudgetConsumption(id);
  const { activateBudget, deleteBudget } = useBudgetActions();

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!budget) return <div className="text-center py-12 text-muted-foreground">Budget introuvable</div>;

  const consMap = new Map(consumption.map((c: any) => [c.budget_line_id, c]));
  const totalConsomme = consumption.reduce((s: number, c: any) => s + Number(c.montant_consomme || 0), 0);
  const pct = budget.montant_total > 0 ? (totalConsomme / Number(budget.montant_total)) * 100 : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{budget.nom}</h1>
            <Badge variant={budget.status === "active" ? "default" : "secondary"}>{budget.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{(budget as any).projects?.nom} · {budget.devise} · taux {budget.taux_change_xof} XOF</p>
        </div>
        {budget.status === "draft" && (
          <Button size="sm" onClick={async () => { await activateBudget(budget.id); }}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Activer
          </Button>
        )}
        <Button variant="destructive" size="sm" onClick={async () => { if (confirm("Supprimer ?")) { await deleteBudget(budget.id); navigate(-1); } }}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Budget total</p><p className="text-xl font-bold">{Number(budget.montant_total).toLocaleString("fr-FR")} {budget.devise}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Consommé</p><p className="text-xl font-bold">{totalConsomme.toLocaleString("fr-FR")} {budget.devise}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Restant</p><p className="text-xl font-bold">{(Number(budget.montant_total) - totalConsomme).toLocaleString("fr-FR")} {budget.devise}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Exécution</p><p className="text-xl font-bold">{pct.toFixed(1)}%</p><Progress value={Math.min(pct, 100)} className="mt-2" /></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Structure budgétaire</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {tree?.categories.map((cat) => {
            const catLines = tree.lines.filter((l) => l.category_id === cat.id);
            const catCons = catLines.reduce((s, l) => s + Number((consMap.get(l.id) as any)?.montant_consomme || 0), 0);
            const catPct = cat.montant_prevu > 0 ? (catCons / Number(cat.montant_prevu)) * 100 : 0;
            return (
              <div key={cat.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">{cat.code}. {cat.libelle}</h3>
                  <span className="text-sm text-muted-foreground">{catCons.toLocaleString("fr-FR")} / {Number(cat.montant_prevu).toLocaleString("fr-FR")} {budget.devise}</span>
                </div>
                <Progress value={Math.min(catPct, 100)} />
                <div className="space-y-1 pl-4 mt-2">
                  {catLines.map((l) => {
                    const cons: any = consMap.get(l.id) || {};
                    const lPct = Number(cons.pct_consomme || 0);
                    const tone = lPct > 90 ? "text-destructive" : lPct > 70 ? "text-amber-600" : "text-muted-foreground";
                    return (
                      <div key={l.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                        <div className="flex-1 truncate pr-2">
                          <p>{l.libelle}</p>
                          {l.villes && l.villes.length > 0 && <p className="text-xs text-muted-foreground">{l.villes.join(", ")}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{Number(l.montant_prevu).toLocaleString("fr-FR")} {budget.devise}</p>
                          <p className={`text-xs ${tone}`}>{lPct.toFixed(0)}% consommé</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
