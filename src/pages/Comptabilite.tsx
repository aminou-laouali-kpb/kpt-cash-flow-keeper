import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { FileText, Download, Loader2, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePayments } from "@/hooks/usePayments";
import { useProjects } from "@/hooks/useProjects";
import { StatusBadge } from "@/components/StatusBadge";
import { exportToCSV } from "@/lib/exportUtils";

const categoryLabels: Record<string, string> = {
  fournitures: "Fournitures", transport: "Transport", restauration: "Restauration",
  hebergement: "Hébergement", communication: "Communication", equipement_sportif: "Équipement sportif",
  location_salle: "Location salle", honoraires: "Honoraires", frais_bancaires: "Frais bancaires",
  assurance: "Assurance", formation: "Formation", evenement: "Événement", autre: "Autre",
};

const modeLabels: Record<string, string> = {
  especes: "Espèces", virement: "Virement", cheque: "Chèque",
  mobile_money: "Mobile Money", carte_bancaire: "Carte bancaire", autre: "Autre",
};

export default function Comptabilite() {
  const navigate = useNavigate();
  const { payments, isLoading: loadingPayments } = usePayments();
  const { projects } = useProjects();
  const [search, setSearch] = useState("");
  const [filterProject, setFilterProject] = useState("all");
  const [filterStatut, setFilterStatut] = useState("all");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  const filtered = payments.filter((p) => {
    if (search && !p.beneficiaire_nom.toLowerCase().includes(search.toLowerCase()) && !p.reference.toLowerCase().includes(search.toLowerCase()) && !p.motif.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterProject !== "all" && p.project_id !== filterProject) return false;
    if (filterStatut !== "all" && p.statut !== filterStatut) return false;
    if (filterDateStart && p.date_paiement < filterDateStart) return false;
    if (filterDateEnd && p.date_paiement > filterDateEnd) return false;
    return true;
  });

  const total = filtered.reduce((s, p) => s + Number(p.montant), 0);

  const handleExportCSV = () => {
    exportToCSV(filtered, projects);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Comptabilité</h1>
          <p className="text-muted-foreground mt-1">Grand livre et exports</p>
        </div>
        <Button variant="outline" onClick={handleExportCSV}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={filterProject} onValueChange={setFilterProject}>
              <SelectTrigger><SelectValue placeholder="Projet" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les projets</SelectItem>
                {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatut} onValueChange={setFilterStatut}>
              <SelectTrigger><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="en_attente_signature">En attente</SelectItem>
                <SelectItem value="signe">Signé</SelectItem>
                <SelectItem value="a_re_signer">À re-signer</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input type="date" placeholder="Du" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} />
              <Input type="date" placeholder="Au" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {loadingPayments ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3 opacity-30" />
              <p>Aucune donnée comptable</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Réf</TableHead>
                    <TableHead>Projet</TableHead>
                    <TableHead>Bénéficiaire</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead className="text-right">Montant</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/paiements/${p.id}`)}>
                      <TableCell className="text-sm">{p.date_paiement}</TableCell>
                      <TableCell className="font-mono text-xs">{p.reference}</TableCell>
                      <TableCell className="text-sm">{(p as any).projects?.nom || "—"}</TableCell>
                      <TableCell className="text-sm">{p.beneficiaire_nom}</TableCell>
                      <TableCell className="text-sm">{categoryLabels[p.categorie] || p.categorie}</TableCell>
                      <TableCell className="text-sm">{modeLabels[p.mode_paiement] || p.mode_paiement}</TableCell>
                      <TableCell className="text-right font-medium">{Number(p.montant).toLocaleString("fr-FR")} {p.devise}</TableCell>
                      <TableCell><StatusBadge status={p.statut} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={6} className="font-bold">Total ({filtered.length} fiches)</TableCell>
                    <TableCell className="text-right font-bold">{total.toLocaleString("fr-FR")} XOF</TableCell>
                    <TableCell />
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
