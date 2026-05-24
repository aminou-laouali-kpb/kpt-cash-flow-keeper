import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useBudgetTree, type BudgetCategory, type BudgetLine } from "@/hooks/useBudgets";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  payment: any;
  remaining: number; // in payment currency
  onConfirm: (input: {
    budget_line_id: string;
    montant_alloue: number;
    montant_alloue_devise_budget: number;
    reasoning?: string;
  }) => Promise<void>;
};

function useActiveBudgets() {
  return useQuery({
    queryKey: ["budgets", "active-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("budgets")
        .select("id, nom, devise, taux_change_xof, status, project_id, projects(nom)")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function ManualAllocationDialog({ open, onOpenChange, payment, remaining, onConfirm }: Props) {
  const { data: budgets = [], isLoading: loadingBudgets } = useActiveBudgets();
  const [budgetId, setBudgetId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("__all__");
  const [lineId, setLineId] = useState<string>("");
  const [montant, setMontant] = useState<string>("");
  const [reasoning, setReasoning] = useState("");
  const [saving, setSaving] = useState(false);

  const budget = budgets.find((b: any) => b.id === budgetId);
  const { data: tree, isLoading: loadingTree } = useBudgetTree(budgetId || undefined);
  const villeProjet = (payment as any)?.projects?.ville as string | null | undefined;

  // Auto-select default budget when opening
  useEffect(() => {
    if (!open) return;
    if (budgetId) return;
    if (budgets.length === 0) return;
    // Try to find budget for project's programme
    const projectId = payment?.project_id;
    const match = projectId ? budgets.find((b: any) => b.project_id === projectId) : null;
    setBudgetId(match?.id || budgets[0].id);
  }, [open, budgets, payment, budgetId]);

  // Reset child selects when budget changes
  useEffect(() => {
    setCategoryId("__all__");
    setLineId("");
  }, [budgetId]);

  // Reset line when category changes
  useEffect(() => { setLineId(""); }, [categoryId]);

  // Pre-fill amount with remaining
  useEffect(() => {
    if (open) setMontant(remaining > 0 ? String(remaining) : String(payment?.montant || ""));
  }, [open, remaining, payment]);

  const rubriques: BudgetCategory[] = useMemo(() => {
    const all = tree?.categories || [];
    // Top-level rubriques (no parent)
    return all.filter((c) => !c.parent_id);
  }, [tree]);

  const lines: BudgetLine[] = useMemo(() => {
    if (!tree) return [];
    let result = tree.lines;
    if (categoryId && categoryId !== "__all__") {
      // include lines whose category is the rubrique or a sub-category of it
      const subIds = new Set<string>([categoryId]);
      tree.categories.forEach((c) => { if (c.parent_id === categoryId) subIds.add(c.id); });
      result = result.filter((l) => l.category_id && subIds.has(l.category_id));
    }
    return result.sort((a, b) => a.libelle.localeCompare(b.libelle));
  }, [tree, categoryId]);

  const handleConfirm = async () => {
    if (!lineId || !budget) return;
    const m = parseFloat(montant);
    if (!Number.isFinite(m) || m <= 0) return;
    // Convert to budget currency
    let mBudget = m;
    if (payment.devise !== budget.devise) {
      const taux = Number(budget.taux_change_xof || 600);
      if (payment.devise === "XOF" && budget.devise === "USD") mBudget = m / taux;
      else if (payment.devise === "USD" && budget.devise === "XOF") mBudget = m * taux;
    }
    setSaving(true);
    try {
      await onConfirm({
        budget_line_id: lineId,
        montant_alloue: m,
        montant_alloue_devise_budget: mBudget,
        reasoning: reasoning.trim() || undefined,
      });
      onOpenChange(false);
      setReasoning("");
      setLineId("");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Imputer manuellement</DialogTitle>
          <DialogDescription>
            Sélectionnez précisément la rubrique et la ligne budgétaire à imputer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Budget</Label>
            <Select value={budgetId} onValueChange={setBudgetId} disabled={loadingBudgets}>
              <SelectTrigger><SelectValue placeholder="Choisir un budget actif" /></SelectTrigger>
              <SelectContent>
                {budgets.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.nom} {b.projects?.nom ? `— ${b.projects.nom}` : ""} ({b.devise})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Rubrique</Label>
            <Select value={categoryId} onValueChange={setCategoryId} disabled={!budgetId || loadingTree}>
              <SelectTrigger><SelectValue placeholder="Toutes les rubriques" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes les rubriques</SelectItem>
                {rubriques.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code ? `${c.code} — ` : ""}{c.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Ligne budgétaire <span className="text-destructive">*</span></Label>
            <Select value={lineId} onValueChange={setLineId} disabled={!budgetId || loadingTree || lines.length === 0}>
              <SelectTrigger>
                <SelectValue placeholder={lines.length === 0 ? "Aucune ligne disponible" : "Choisir une ligne"} />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {lines.map((l) => {
                  const villes = (l.villes || []) as string[];
                  const villeTag = villes.length > 0 ? ` [${villes.join(", ")}]` : "";
                  return (
                    <SelectItem key={l.id} value={l.id}>
                      {l.libelle}{villeTag}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {villeProjet && (
              <p className="text-xs text-muted-foreground">Ville du projet : {villeProjet}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Montant à imputer ({payment.devise})</Label>
            <Input
              type="number"
              step="0.01"
              value={montant}
              onChange={(e) => setMontant(e.target.value)}
            />
            {budget && payment.devise !== budget.devise && (
              <p className="text-xs text-muted-foreground">
                Sera converti en {budget.devise} au taux {Number(budget.taux_change_xof || 600)} XOF/USD.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Restant à imputer : {remaining.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} {payment.devise}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Commentaire (optionnel)</Label>
            <Textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Justification du choix de la rubrique"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Annuler</Button>
          <Button onClick={handleConfirm} disabled={saving || !lineId || !budget}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Valider l'imputation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}