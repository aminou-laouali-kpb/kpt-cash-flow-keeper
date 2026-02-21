import jsPDF from "jspdf";
import { Payment } from "@/hooks/usePayments";
import { Settings } from "@/hooks/useSettings";

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
  brouillon: "Brouillon", en_attente_signature: "En attente de signature", signe: "Signé", a_re_signer: "À re-signer",
};

export async function generatePaymentPDF(payment: Payment, settings: Settings, projectName?: string) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(settings.nom, pageWidth / 2, y, { align: "center" });
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  if (settings.adresse) { doc.text(settings.adresse, pageWidth / 2, y, { align: "center" }); y += 5; }
  const contactLine = [settings.telephone, settings.email].filter(Boolean).join(" | ");
  if (contactLine) { doc.text(contactLine, pageWidth / 2, y, { align: "center" }); y += 5; }

  y += 3;
  doc.setDrawColor(200);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  // Title
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("FICHE DE PAIEMENT / JUSTIFICATIF INTERNE", pageWidth / 2, y, { align: "center" });
  y += 10;

  // Meta
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const meta = [
    ["Référence", payment.reference],
    ["Date", payment.date_paiement],
    ["Projet", projectName || "—"],
    ["Lieu", payment.lieu || "—"],
    ["Statut", statusLabels[payment.statut] || payment.statut],
    ["Version", `v${payment.version_courante}`],
  ];
  meta.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 15, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 55, y);
    y += 5;
  });

  y += 5;

  // Section 1: Beneficiaire
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("1. Informations du bénéficiaire", 15, y);
  y += 6;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const benefInfo = [
    ["Nom", payment.beneficiaire_nom],
    ["Téléphone", payment.beneficiaire_telephone || "—"],
    ["Email", payment.beneficiaire_email || "—"],
    ["Adresse", payment.beneficiaire_adresse || "—"],
  ];
  if (payment.beneficiaire_piece_type) {
    benefInfo.push(["Pièce d'identité", `${payment.beneficiaire_piece_type} — ${payment.beneficiaire_piece_numero || ""}`]);
  }
  benefInfo.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 20, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, 65, y);
    y += 5;
  });

  y += 5;

  // Section 2: Details
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("2. Détails du paiement", 15, y);
  y += 6;
  doc.setFontSize(9);
  const details = [
    ["Montant", `${Number(payment.montant).toLocaleString("fr-FR")} ${payment.devise}`],
    ["Catégorie", categoryLabels[payment.categorie] || payment.categorie],
    ["Mode de paiement", modeLabels[payment.mode_paiement] || payment.mode_paiement],
    ["Motif", payment.motif],
  ];
  if (payment.reference_transaction) details.push(["Réf. transaction", payment.reference_transaction]);
  if (payment.personne_effectuant) details.push(["Effectué par", payment.personne_effectuant]);

  details.forEach(([label, value]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label} :`, 20, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(value, 110);
    doc.text(lines, 65, y);
    y += lines.length * 5;
  });

  y += 5;

  // Section 3: Observations
  if (payment.commentaire || payment.motif_absence_recu) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("3. Justificatifs / Observations", 15, y);
    y += 6;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (payment.motif_absence_recu) {
      doc.text(`Motif absence de reçu : ${payment.motif_absence_recu}`, 20, y);
      y += 5;
    }
    if (payment.commentaire) {
      const lines = doc.splitTextToSize(`Commentaire : ${payment.commentaire}`, pageWidth - 40);
      doc.text(lines, 20, y);
      y += lines.length * 5;
    }
    y += 5;
  }

  // Section 4: Signatures
  const sigY = Math.max(y + 10, 220);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Signatures", 15, sigY - 5);

  const sigWidth = (pageWidth - 40) / 3;
  const sigLabels = [
    { title: settings.president_fonction || "Président", name: settings.president_nom || "" },
    { title: "Bénéficiaire", name: payment.beneficiaire_nom },
    { title: settings.tresoriere_fonction || "Trésorière", name: settings.tresoriere_nom || "" },
  ];
  sigLabels.forEach((sig, i) => {
    const x = 15 + i * (sigWidth + 5);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(sig.title, x + sigWidth / 2, sigY, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.text(sig.name, x + sigWidth / 2, sigY + 5, { align: "center" });
    doc.rect(x, sigY + 8, sigWidth, 25);
  });

  // Footer
  const footerY = 280;
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  if (settings.mention_legale) {
    doc.text(settings.mention_legale, pageWidth / 2, footerY, { align: "center", maxWidth: pageWidth - 30 });
  }
  doc.text(`Généré le ${new Date().toLocaleDateString("fr-FR")} — ${payment.reference} v${payment.version_courante}`, pageWidth / 2, footerY + 5, { align: "center" });

  doc.save(`${payment.reference}.pdf`);
}
