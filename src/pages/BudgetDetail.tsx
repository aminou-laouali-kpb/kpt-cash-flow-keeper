import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, CheckCircle2, Trash2, Sparkles, Download, Share2, Copy, FileSpreadsheet, FileText, Lightbulb, AlertTriangle, TrendingDown } from "lucide-react";
import { useBudget, useBudgetTree, useBudgetActions, useBudgetConsumption } from "@/hooks/useBudgets";
import { useBudgetExport } from "@/hooks/useBudgetExport";
import { useBudgetShares } from "@/hooks/useBudgetShares";
import { useBudgetInsights } from "@/hooks/useBudgetInsights";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export default function BudgetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: budget, isLoading } = useBudget(id);
  const { data: tree } = useBudgetTree(id);
  const { data: consumption = [] } = useBudgetConsumption(id);
  const { activateBudget, deleteBudget, batchCategorize, isBatchRunning } = useBudgetActions();
  const { exportPDF, exportXLSX, isExporting } = useBudgetExport();
  const { links, createLink, revokeLink } = useBudgetShares(id);
  const { insights, generatedAt, generate, isGenerating } = useBudgetInsights(id);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareDays, setShareDays] = useState<string>("30");
  const [shareLabel, setShareLabel] = useState("");
  const [shareExport, setShareExport] = useState(true);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!budget) return <div className="text-center py-12 text-muted-foreground">Budget introuvable</div>;

  const consMap = new Map(consumption.map((c: any) => [c.budget_line_id, c]));
  const totalConsomme = consumption.reduce((s: number, c: any) => s + Number(c.montant_consomme || 0), 0);
  const pct = budget.montant_total > 0 ? (totalConsomme / Number(budget.montant_total)) * 100 : 0;

  const publicUrl = (token: string) => `${window.location.origin}/public/budget/${token}`;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{budget.nom}</h1>
            <Badge variant={budget.status === "active" ? "default" : "secondary"}>{budget.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm">{(budget as any).projects?.nom} · {budget.devise} · taux {budget.taux_change_xof} XOF</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline" disabled={isExporting}>
              {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />} Télécharger
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => exportPDF(budget.id)}><FileText className="h-4 w-4 mr-2" /> PDF (bailleur)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportXLSX(budget.id)}><FileSpreadsheet className="h-4 w-4 mr-2" /> Excel (.xlsx)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={shareOpen} onOpenChange={setShareOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline"><Share2 className="h-4 w-4 mr-1" /> Partager</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Partager le budget en lecture seule</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Nom du destinataire (optionnel)</Label>
                  <Input value={shareLabel} onChange={(e) => setShareLabel(e.target.value)} placeholder="Ex. Bailleur Niger" />
                </div>
                <div>
                  <Label>Validité</Label>
                  <Select value={shareDays} onValueChange={setShareDays}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 jours</SelectItem>
                      <SelectItem value="30">30 jours</SelectItem>
                      <SelectItem value="90">90 jours</SelectItem>
                      <SelectItem value="0">Illimité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Autoriser le téléchargement PDF/Excel</Label>
                <Switch checked={shareExport} onCheckedChange={setShareExport} />
              </div>
              <Button onClick={async () => {
                const days = shareDays === "0" ? null : Number(shareDays);
                await createLink({ budget_id: budget.id, days, allow_export: shareExport, label: shareLabel });
                setShareLabel("");
              }}>Créer un nouveau lien</Button>

              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-semibold">Liens actifs</p>
                {links.length === 0 && <p className="text-sm text-muted-foreground">Aucun lien créé.</p>}
                {links.map((l) => {
                  const expired = l.expires_at && new Date(l.expires_at) < new Date();
                  const revoked = !!l.revoked_at;
                  return (
                    <div key={l.id} className="border rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{l.label || "Lien"}{revoked && <Badge variant="destructive" className="ml-2">Révoqué</Badge>}{!revoked && expired && <Badge variant="secondary" className="ml-2">Expiré</Badge>}</p>
                          <p className="text-xs text-muted-foreground">Créé le {new Date(l.created_at).toLocaleDateString("fr-FR")} · {l.expires_at ? `expire le ${new Date(l.expires_at).toLocaleDateString("fr-FR")}` : "sans expiration"} · {l.view_count} vues</p>
                        </div>
                        {!revoked && <Button size="sm" variant="ghost" onClick={() => revokeLink(l.id)}>Révoquer</Button>}
                      </div>
                      {!revoked && !expired && (
                        <div className="flex gap-2">
                          <Input readOnly value={publicUrl(l.token)} className="text-xs" />
                          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(publicUrl(l.token)); toast({ title: "Lien copié" }); }}><Copy className="h-4 w-4" /></Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <DialogFooter><Button variant="outline" onClick={() => setShareOpen(false)}>Fermer</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        {budget.status === "draft" && (
          <Button size="sm" onClick={async () => { await activateBudget(budget.id); }}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Activer
          </Button>
        )}
        {budget.status === "active" && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="secondary" disabled={isBatchRunning}>
                {isBatchRunning ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Imputer les dépenses (IA)
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Imputer automatiquement les dépenses ?</AlertDialogTitle>
                <AlertDialogDescription>
                  L'IA va analyser toutes les dépenses du programme qui ne sont pas encore imputées et proposer une ligne budgétaire pour chacune. Vous pourrez ensuite valider ou corriger les imputations marquées "à vérifier". L'opération peut prendre 1 à 2 minutes selon le nombre de dépenses.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={() => batchCategorize({ budget_id: budget.id, only_unallocated: true })}>
                  Lancer l'imputation
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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

      <Card className="border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="h-5 w-5 text-amber-500" /> Conseils de l'IA</CardTitle>
            {generatedAt && <p className="text-xs text-muted-foreground mt-1">Généré le {new Date(generatedAt).toLocaleString("fr-FR")}</p>}
          </div>
          <Button size="sm" variant="outline" onClick={() => generate(budget.id)} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            {insights ? "Re-analyser" : "Analyser le budget"}
          </Button>
        </CardHeader>
        {insights && (
          <CardContent className="space-y-5">
            <div className="bg-muted/50 rounded-md p-4">
              <p className="text-sm whitespace-pre-line">{insights.synthese}</p>
            </div>

            {insights.alertes?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Dépassements et rééquilibrages</h3>
                {insights.alertes.map((a, i) => (
                  <div key={i} className="border-l-4 border-destructive pl-3 py-2">
                    <p className="text-sm font-medium">{a.ligne} — dépassé de {Number(a.depassement).toLocaleString("fr-FR")} {budget.devise} ({a.pct_consomme.toFixed(0)}%)</p>
                    <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                      {a.suggestions?.map((s, j) => (
                        <li key={j}>→ Virer {Number(s.montant_suggere).toLocaleString("fr-FR")} {budget.devise} depuis <span className="font-medium text-foreground">{s.ligne_donneuse}</span> · {s.raison}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {insights.recommandations?.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2"><TrendingDown className="h-4 w-4 text-amber-600" /> Lignes sous-utilisées · idées de dépenses</h3>
                {insights.recommandations.map((r, i) => (
                  <div key={i} className="border-l-4 border-amber-500 pl-3 py-2">
                    <p className="text-sm font-medium">{r.ligne} — reste {Number(r.reste).toLocaleString("fr-FR")} {budget.devise}</p>
                    <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside space-y-1">
                      {r.idees?.map((idee, j) => <li key={j}>{idee}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
        {!insights && !isGenerating && (
          <CardContent><p className="text-sm text-muted-foreground">Cliquez sur « Analyser le budget » pour obtenir une synthèse, des suggestions de rééquilibrage en cas de dépassement, et des idées de dépenses pour les lignes sous-utilisées.</p></CardContent>
        )}
      </Card>

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
