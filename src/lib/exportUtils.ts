import { Payment } from "@/hooks/usePayments";
import { Project } from "@/hooks/useProjects";
import { saveAs } from "file-saver";

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

const statusLabels: Record<string, string> = {
  brouillon: "Brouillon", en_attente_signature: "En attente", signe: "Signé", a_re_signer: "À re-signer",
};

export function exportToCSV(payments: Payment[], projects: Project[]) {
  const projectMap = new Map(projects.map((p) => [p.id, p.nom]));

  const headers = ["Date", "Référence", "Projet", "Bénéficiaire", "Catégorie", "Mode", "Montant", "Devise", "Motif", "Statut"];
  const rows = payments.map((p) => [
    p.date_paiement,
    p.reference,
    projectMap.get(p.project_id || "") || "",
    p.beneficiaire_nom,
    categoryLabels[p.categorie] || p.categorie,
    modeLabels[p.mode_paiement] || p.mode_paiement,
    p.montant.toString(),
    p.devise,
    p.motif,
    statusLabels[p.statut] || p.statut,
  ]);

  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  saveAs(blob, `kpt-comptabilite-${new Date().toISOString().split("T")[0]}.csv`);
}
