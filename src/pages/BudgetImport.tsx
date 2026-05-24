import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Upload, FileSpreadsheet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProjects } from "@/hooks/useProjects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function BudgetImport() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const { projects } = useProjects();
  const programmes = projects.filter((p) => p.type_projet === "programme");

  const [projectId, setProjectId] = useState(params.get("project") || "");
  const [taux, setTaux] = useState(600);
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleImport = async () => {
    if (!projectId) return toast({ title: "Sélectionne un programme", variant: "destructive" });
    if (!file) return toast({ title: "Choisis un fichier Excel", variant: "destructive" });

    setImporting(true);
    try {
      // Upload file
      const ext = file.name.split(".").pop();
      const path = `budgets/${projectId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage.from("kpt-files").upload(path, file);
      if (upErr) throw upErr;

      // Bucket is private — pass the storage path; the edge function will download via service role.
      const { data, error } = await supabase.functions.invoke("import-budget", {
        body: { project_id: projectId, file_path: path, file_name: file.name, taux_change_xof: taux },
      });
      if (error) throw error;

      toast({ title: "Budget importé", description: `${data.rubriques} rubriques, ${data.lines} lignes` });
      navigate(`/budgets/${data.budget_id}`);
    } catch (e: any) {
      toast({ title: "Erreur d'import", description: e.message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importer un budget</h1>
          <p className="text-muted-foreground mt-1">Upload du fichier Excel — l'IA détecte automatiquement la structure</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Configuration</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Programme</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un programme" /></SelectTrigger>
              <SelectContent>
                {programmes.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
              </SelectContent>
            </Select>
            {programmes.length === 0 && (
              <p className="text-xs text-muted-foreground mt-2">Aucun programme. Crée d'abord un projet de type "programme".</p>
            )}
          </div>

          <div>
            <Label>Taux de change USD → XOF</Label>
            <Input type="number" value={taux} onChange={(e) => setTaux(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground mt-1">Utilisé pour convertir les dépenses XOF vers la devise du budget.</p>
          </div>

          <div>
            <Label>Fichier Excel (.xlsx)</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center mt-2">
              <FileSpreadsheet className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
              {file ? (
                <p className="text-sm font-medium">{file.name}</p>
              ) : (
                <p className="text-sm text-muted-foreground mb-2">Glisse un fichier ou clique pour parcourir</p>
              )}
              <Button variant="outline" size="sm" asChild className="mt-2">
                <label className="cursor-pointer">
                  {file ? "Changer" : "Parcourir"}
                  <input type="file" className="hidden" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </label>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Annuler</Button>
        <Button onClick={handleImport} disabled={importing || !file || !projectId}>
          {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {importing ? "Import en cours…" : "Lancer l'import IA"}
        </Button>
      </div>
    </div>
  );
}
