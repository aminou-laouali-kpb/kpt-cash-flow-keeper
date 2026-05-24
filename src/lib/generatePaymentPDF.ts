import jsPDF from "jspdf";
import { Payment } from "@/hooks/usePayments";
import { Settings } from "@/hooks/useSettings";
import logoFallback from "@/assets/Cachet_KPT.png";
import { signFileUrl } from "@/lib/storageUrl";

const categoryLabels: Record<string, string> = {
  fournitures: "Fournitures", transport: "Transport", restauration: "Restauration",
  hebergement: "Hébergement", communication: "Communication", equipement_sportif: "Équipement sportif",
  location_salle: "Location salle", honoraires: "Honoraires", frais_bancaires: "Frais bancaires",
  assurance: "Assurance", formation: "Formation", evenement: "Événement", autre: "Autre",
};

const modeLabels: Record<string, string> = {
  especes: "Espèces", virement: "Virement", cheque: "Chèque",
  mobile_money: "MyNITA", carte_bancaire: "Carte bancaire", autre: "Autre",
};

const statusLabels: Record<string, string> = {
  brouillon: "Brouillon", en_attente_signature: "En attente de signature", signe: "Signé", a_re_signer: "À re-signer",
};

const deviseLabels: Record<string, string> = {
  XOF: "Francs CFA", EUR: "Euros", USD: "Dollars US",
};

function formatMontant(montant: number, devise: string): string {
  const formatted = Number(montant).toLocaleString("fr-FR").replace(/\s/g, ".");
  return `${formatted} ${deviseLabels[devise] || devise}`;
}

async function loadImageAsBase64(url: string): Promise<string | null> {
  try {
    // Resolve stored bucket paths / legacy public URLs to short-lived signed URLs.
    const resolved = (await signFileUrl(url, 600)) || url;
    const response = await fetch(resolved, { mode: "cors" });
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadLocalImage(src: string): Promise<string | null> {
  try {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });
  } catch {
    return null;
  }
}

type SigData = { base64: string; w: number; h: number } | null;

async function loadSigWithDims(url: string | null | undefined): Promise<SigData> {
  if (!url) return null;
  const base64 = await loadImageAsBase64(url);
  if (!base64) return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ base64, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ base64, w: 1, h: 1 });
    img.src = base64;
  });
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, pageWidth: number): number {
  const margin = 15;
  const width = pageWidth - margin * 2;
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, y - 5, width, 8, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(title, margin + 3, y);
  return y + 8;
}

function drawKeyValue(doc: jsPDF, label: string, value: string, y: number, labelX = 20, valueX = 65, maxWidth = 110): number {
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(80, 80, 80);
  doc.text(`${label} :`, labelX, y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  const lines = doc.splitTextToSize(value, maxWidth);
  doc.text(lines, valueX, y);
  return y + lines.length * 5;
}

export async function generatePaymentPDF(
  payment: Payment,
  settings: Settings,
  projectName?: string,
  beneficiaireSignatureUrl?: string | null,
  proofDocuments?: { file_url: string; file_name: string; file_type?: string | null }[],
) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 12;

  // --- Load images in parallel ---
  const [logoBase64, presidentSig, tresoriereSig, beneficiaireSig, proofImg] = await Promise.all([
    settings.logo_url ? loadImageAsBase64(settings.logo_url) : loadLocalImage(logoFallback),
    loadSigWithDims(settings.president_signature_url),
    loadSigWithDims(settings.tresoriere_signature_url),
    loadSigWithDims(beneficiaireSignatureUrl),
    (async () => {
      const firstImg = proofDocuments?.find(d => (d.file_type || "").startsWith("image/"));
      if (!firstImg) return null;
      return loadSigWithDims(firstImg.file_url);
    })(),
  ]);

  // === HEADER: Logo + Association Info ===
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, "PNG", pageWidth / 2 - 12, y, 24, 24);
      y += 27;
    } catch {
      y += 2;
    }
  }

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(settings.nom, pageWidth / 2, y, { align: "center" });
  y += 6;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  if (settings.adresse) {
    doc.text(settings.adresse, pageWidth / 2, y, { align: "center" });
    y += 4;
  }
  const contactLine = [settings.telephone, settings.email].filter(Boolean).join("  •  ");
  if (contactLine) {
    doc.text(contactLine, pageWidth / 2, y, { align: "center" });
    y += 4;
  }

  // Separator line
  y += 2;
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.8);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // === TITLE BOX ===
  doc.setFillColor(230, 235, 245);
  doc.roundedRect(margin, y - 4, pageWidth - margin * 2, 12, 2, 2, "F");
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 80);
  doc.text("FICHE DE PAIEMENT / JUSTIFICATIF INTERNE", pageWidth / 2, y + 4, { align: "center" });
  y += 14;

  // Subtitle: reference + date
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`${payment.reference}  —  ${payment.date_paiement}`, pageWidth / 2, y, { align: "center" });
  y += 8;

  // === META TABLE ===
  const metaData = [
    ["Référence", payment.reference],
    ["Date", payment.date_paiement],
    ["Projet", projectName || "—"],
    ["Lieu", payment.lieu || "—"],
    ["Statut", statusLabels[payment.statut] || payment.statut],
    ["Version", `v${payment.version_courante}`],
  ];

  const colWidth = (pageWidth - margin * 2) / 2;
  const rowH = 7;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);

  for (let i = 0; i < metaData.length; i += 2) {
    const rowY = y + (i / 2) * rowH;
    // Left cell
    doc.rect(margin, rowY, colWidth, rowH);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(metaData[i][0] + " :", margin + 2, rowY + 5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    doc.text(metaData[i][1], margin + 28, rowY + 5);
    // Right cell
    if (metaData[i + 1]) {
      doc.rect(margin + colWidth, rowY, colWidth, rowH);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(80, 80, 80);
      doc.text(metaData[i + 1][0] + " :", margin + colWidth + 2, rowY + 5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(metaData[i + 1][1], margin + colWidth + 28, rowY + 5);
    }
  }
  y += Math.ceil(metaData.length / 2) * rowH + 6;

  // === SECTION 1: Bénéficiaire ===
  y = drawSectionTitle(doc, "1. INFORMATIONS DU BÉNÉFICIAIRE", y, pageWidth);
  y += 2;

  const benefInfo: [string, string][] = [
    ["Nom", payment.beneficiaire_nom],
    ["Téléphone", payment.beneficiaire_telephone || "—"],
    ["Email", payment.beneficiaire_email || "—"],
    ["Adresse", payment.beneficiaire_adresse || "—"],
  ];
  if (payment.beneficiaire_piece_type) {
    benefInfo.push(["Pièce d'identité", `${payment.beneficiaire_piece_type} — ${payment.beneficiaire_piece_numero || ""}`]);
  }
  for (const [label, value] of benefInfo) {
    y = drawKeyValue(doc, label, value, y);
  }
  y += 4;

  // === SECTION 2: Détails du paiement ===
  y = drawSectionTitle(doc, "2. DÉTAILS DU PAIEMENT", y, pageWidth);
  y += 2;

  const details: [string, string][] = [
    ["Montant", formatMontant(payment.montant, payment.devise)],
    ["Catégorie", categoryLabels[payment.categorie] || payment.categorie],
    ["Mode de paiement", modeLabels[payment.mode_paiement] || payment.mode_paiement],
    ["Motif", payment.motif],
  ];
  if (payment.reference_transaction) details.push(["Réf. transaction", payment.reference_transaction]);
  if (payment.personne_effectuant) details.push(["Effectué par", payment.personne_effectuant]);

  for (const [label, value] of details) {
    y = drawKeyValue(doc, label, value, y);
  }
  y += 4;

  // === SECTION 3: Observations ===
  if (payment.commentaire || payment.motif_absence_recu) {
    y = drawSectionTitle(doc, "3. JUSTIFICATIFS / OBSERVATIONS", y, pageWidth);
    y += 2;
    if (payment.motif_absence_recu) {
      y = drawKeyValue(doc, "Motif absence de reçu", payment.motif_absence_recu, y);
    }
    if (payment.commentaire) {
      y = drawKeyValue(doc, "Commentaire", payment.commentaire, y);
    }
    y += 4;
  }

  // === SECTION 4: Signatures ===
  const hasProof = (proofDocuments?.length || 0) > 0;
  const sigWidth = (pageWidth - margin * 2 - 10) / 3;
  const sigBoxH = 50; // Doubled for larger signatures
  const sigStartY = Math.max(y + 4, 180);
  const sigSectionY = drawSectionTitle(
    doc,
    hasProof ? "JUSTIFICATIF TENANT LIEU DE SIGNATURE" : "SIGNATURES",
    sigStartY,
    pageWidth,
  );

  if (hasProof) {
    const boxY = sigSectionY + 2;
    const boxW = pageWidth - margin * 2;
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.rect(margin, boxY + 4, boxW, sigBoxH);

    if (proofImg) {
      try {
        const totalW = boxW - 6;
        const totalH = sigBoxH - 6;
        const imgRatio = proofImg.w / proofImg.h;
        const boxRatio = totalW / totalH;
        let renderW: number, renderH: number;
        if (imgRatio > boxRatio) {
          renderW = totalW; renderH = totalW / imgRatio;
        } else {
          renderH = totalH; renderW = totalH * imgRatio;
        }
        const offsetX = margin + 3 + (totalW - renderW) / 2;
        const offsetY = boxY + 7 + (totalH - renderH) / 2;
        doc.addImage(proofImg.base64, "PNG", offsetX, offsetY, renderW, renderH);
      } catch { /* ignore */ }
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      const names = (proofDocuments || []).map(d => d.file_name).join(", ");
      doc.text(`Pièce(s) jointe(s) : ${names}`, pageWidth / 2, boxY + sigBoxH / 2 + 2, { align: "center", maxWidth: boxW - 10 });
    }

    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(120, 120, 120);
    doc.text(
      "Ce justificatif tient lieu de signature des parties.",
      pageWidth / 2, boxY + sigBoxH + 9, { align: "center" },
    );
  } else {
  const sigLabels = [
    { title: settings.president_fonction || "Président", name: settings.president_nom || "", sig: presidentSig },
    { title: "Bénéficiaire", name: payment.beneficiaire_nom, sig: beneficiaireSig },
    { title: settings.tresoriere_fonction || "Trésorière", name: settings.tresoriere_nom || "", sig: tresoriereSig },
  ];

  for (let i = 0; i < sigLabels.length; i++) {
    const entry = sigLabels[i];
    const x = margin + i * (sigWidth + 5);
    const boxY = sigSectionY + 2;

    // Title
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 30, 30);
    doc.text(entry.title, x + sigWidth / 2, boxY, { align: "center" });

    // Name
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(entry.name, x + sigWidth / 2, boxY + 5, { align: "center" });

    // Box
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.rect(x, boxY + 8, sigWidth, sigBoxH);

    // Signature image or placeholder
    if (entry.sig) {
      try {
        const totalW = sigWidth - 6;
        const totalH = sigBoxH - 6;
        const maxW = totalW * 0.75;
        const maxH = totalH * 0.75;
        const imgRatio = entry.sig.w / entry.sig.h;
        const boxRatio = maxW / maxH;
        let renderW: number, renderH: number;
        if (imgRatio > boxRatio) {
          renderW = maxW;
          renderH = maxW / imgRatio;
        } else {
          renderH = maxH;
          renderW = maxH * imgRatio;
        }
        const offsetX = x + 3 + (totalW - renderW) / 2;
        const offsetY = boxY + 11 + (totalH - renderH) / 2;
        doc.addImage(entry.sig.base64, "PNG", offsetX, offsetY, renderW, renderH);
      } catch {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text("Erreur de chargement", x + sigWidth / 2, boxY + 25, { align: "center" });
      }
    } else {
      doc.setFontSize(7);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("Non signé", x + sigWidth / 2, boxY + 25, { align: "center" });
    }
  }
  }

  // === FOOTER ===
  const footerY = 278;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(120, 120, 120);
  if (settings.mention_legale) {
    doc.text(settings.mention_legale, pageWidth / 2, footerY, { align: "center", maxWidth: pageWidth - 30 });
  }
  doc.text(
    `Généré le ${new Date().toLocaleDateString("fr-FR")} — ${payment.reference} v${payment.version_courante}`,
    pageWidth / 2, footerY + 5, { align: "center" },
  );

  doc.save(`${payment.reference}.pdf`);
}
