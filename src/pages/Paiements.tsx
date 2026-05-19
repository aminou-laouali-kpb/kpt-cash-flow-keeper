import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Receipt, Plus, Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePayments } from "@/hooks/usePayments";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Paiements() {
  const navigate = useNavigate();
  const { payments, isLoading } = usePayments();
  const [filter, setFilter] = useState<"all" | "to_validate" | "auto" | "validated" | "none">("all");

  const { data: allocs = [] } = useQuery({
    queryKey: ["all_payment_allocations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_budget_allocations")
        .select("payment_id, confidence, source, validated_at, budget_lines(libelle)");
      if (error) throw error;
      return data || [];
    },
  });

  const allocByPayment = useMemo(() => {
    const m = new Map<string, any>();
    for (const a of allocs) m.set((a as any).payment_id, a);
    return m;
  }, [allocs]);

  const filtered = useMemo(() => {
    return payments.filter((p) => {
      const a = allocByPayment.get(p.id);
      if (filter === "none") return !a;
      if (filter === "validated") return a && a.validated_at;
      if (filter === "to_validate") return a && !a.validated_at && Number(a.confidence || 0) < 0.75;
      if (filter === "auto") return a && !a.validated_at && Number(a.confidence || 0) >= 0.75;
      return true;
    });
  }, [payments, allocByPayment, filter]);

  const counts = useMemo(() => {
    let none = 0, to_validate = 0, auto = 0, validated = 0;
    for (const p of payments) {
      const a = allocByPayment.get(p.id);
      if (!a) none++;
      else if (a.validated_at) validated++;
      else if (Number(a.confidence || 0) < 0.75) to_validate++;
      else auto++;
    }
    return { none, to_validate, auto, validated };
  }, [payments, allocByPayment]);

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

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="all">Tous ({payments.length})</TabsTrigger>
          <TabsTrigger value="to_validate">À valider ({counts.to_validate})</TabsTrigger>
          <TabsTrigger value="auto">Imputés IA ({counts.auto})</TabsTrigger>
          <TabsTrigger value="validated">Validés ({counts.validated})</TabsTrigger>
          <TabsTrigger value="none">Non imputés ({counts.none})</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-3 opacity-30" />
              <p>Aucun paiement dans cette catégorie</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => {
            const a = allocByPayment.get(p.id);
            const lineLibelle = a?.budget_lines?.libelle;
            let imputBadge: JSX.Element | null = null;
            if (!a) {
              imputBadge = <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground"><AlertCircle className="h-3 w-3" /> Non imputé</span>;
            } else if (a.validated_at) {
              imputBadge = <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3" /> Validé</span>;
            } else if (Number(a.confidence || 0) < 0.75) {
              imputBadge = <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800"><AlertCircle className="h-3 w-3" /> À valider</span>;
            } else {
              imputBadge = <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800"><Sparkles className="h-3 w-3" /> IA {Math.round(Number(a.confidence) * 100)}%</span>;
            }
            return (
              <Card key={p.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/paiements/${p.id}`)}>
                <CardContent className="py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{p.beneficiaire_nom}</p>
                        <StatusBadge status={p.statut} />
                        {imputBadge}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {p.reference} · {(p as any).projects?.nom || "—"} · {p.date_paiement}
                        {lineLibelle && <> · <span className="italic">{lineLibelle}</span></>}
                      </p>
                    </div>
                    <p className="font-bold text-lg whitespace-nowrap">{Number(p.montant).toLocaleString("fr-FR")} {p.devise}</p>
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
