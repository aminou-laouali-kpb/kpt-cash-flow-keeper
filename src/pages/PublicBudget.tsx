import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR").replace(/\s/g, ".");

export default function PublicBudget() {
  const { token } = useParams();
  const [state, setState] = useState<{ loading: boolean; error?: string; data?: any }>({ loading: true });

  useEffect(() => {
    if (!token) return;
    fetch(`${SUPABASE_URL}/functions/v1/public-budget-view?token=${token}`)
      .then((r) => r.json())
      .then((d) => d.error ? setState({ loading: false, error: d.error }) : setState({ loading: false, data: d }))
      .catch((e) => setState({ loading: false, error: e.message }));
  }, [token]);

  if (state.loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (state.error) return <div className="min-h-screen flex items-center justify-center p-6"><Card><CardContent className="pt-6"><p className="text-destructive">{state.error}</p></CardContent></Card></div>;

  const { budget, categories, lines, consumption, allocations } = state.data;
  const consMap = new Map((consumption || []).map((c: any) => [c.budget_line_id, c]));
  const totalCons = (consumption || []).reduce((s: number, c: any) => s + Number(c.montant_consomme || 0), 0);
  const totalPct = Number(budget.montant_total) > 0 ? (totalCons / Number(budget.montant_total)) * 100 : 0;

  return (
    <div className="min-h-screen bg-muted/30 py-8">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        <div className="bg-card rounded-lg p-6 shadow-sm border">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Vue partagée · Karaté Pour Tous</p>
              <h1 className="text-2xl font-bold mt-1">{budget.nom}</h1>
              <p className="text-sm text-muted-foreground">{budget.projects?.nom} · {budget.devise}</p>
            </div>
            <Badge variant="outline">Lecture seule · temps réel</Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Budget total</p><p className="text-lg font-bold">{fmt(budget.montant_total)} {budget.devise}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Consommé</p><p className="text-lg font-bold">{fmt(totalCons)} {budget.devise}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Restant</p><p className="text-lg font-bold">{fmt(Number(budget.montant_total) - totalCons)} {budget.devise}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-xs text-muted-foreground">Exécution</p><p className="text-lg font-bold">{totalPct.toFixed(1)}%</p><Progress value={Math.min(totalPct, 100)} className="mt-2" /></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Structure budgétaire</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {(categories || []).map((cat: any) => {
              const catLines = (lines || []).filter((l: any) => l.category_id === cat.id);
              const catCons = catLines.reduce((s: number, l: any) => s + Number((consMap.get(l.id) as any)?.montant_consomme || 0), 0);
              const catPct = Number(cat.montant_prevu) > 0 ? (catCons / Number(cat.montant_prevu)) * 100 : 0;
              return (
                <div key={cat.id} className="space-y-2">
                  <div className="flex justify-between text-sm font-semibold"><span>{cat.code} {cat.libelle}</span><span>{fmt(catCons)} / {fmt(cat.montant_prevu)} {budget.devise}</span></div>
                  <Progress value={Math.min(catPct, 100)} />
                  <div className="pl-4 space-y-1">
                    {catLines.map((l: any) => {
                      const c: any = consMap.get(l.id) || {};
                      return (
                        <div key={l.id} className="flex justify-between text-xs py-1 border-b last:border-0">
                          <span className="truncate pr-2">{l.libelle}</span>
                          <span className="text-muted-foreground">{fmt(Number(c.montant_consomme || 0))} / {fmt(l.montant_prevu)} · {Number(c.pct_consomme || 0).toFixed(0)}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Dépenses imputées ({(allocations || []).length})</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-1 text-sm">
              {(allocations || []).slice(0, 200).map((a: any) => (
                <div key={a.id} className="flex justify-between py-2 border-b last:border-0">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-medium truncate">{a.payments?.motif}</p>
                    <p className="text-xs text-muted-foreground">{new Date(a.payments?.date_paiement).toLocaleDateString("fr-FR")} · {a.payments?.beneficiaire_nom}</p>
                  </div>
                  <p className="font-semibold">{fmt(a.montant_alloue_devise_budget ?? a.montant_alloue)} {budget.devise}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground py-4">Mise à jour en temps réel · Karaté Pour Tous (KPT)</p>
      </div>
    </div>
  );
}