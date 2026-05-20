import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";

type Line = { id: string; category_id: string | null; libelle: string; montant_prevu: number; villes?: string[] | null };
type Cat = { id: string; code: string | null; libelle: string; montant_prevu: number; ordre?: number };
type Cons = { budget_line_id: string; montant_consomme: number; pct_consomme: number };
type Alloc = {
  id: string;
  budget_line_id: string;
  montant_alloue: number;
  montant_alloue_devise_budget: number | null;
  source: string;
  confidence: number | null;
  payment: { reference: string; date_paiement: string; beneficiaire_nom: string; motif: string; devise: string; montant: number };
};

export type BudgetExportData = {
  budget: { nom: string; devise: string; taux_change_xof: number; montant_total: number; status: string; project_nom?: string };
  categories: Cat[];
  lines: Line[];
  consumption: Cons[];
  allocations: Alloc[];
  unallocated: { reference: string; date_paiement: string; beneficiaire_nom: string; motif: string; montant: number; devise: string }[];
};

const fmt = (n: number) => Number(n || 0).toLocaleString("fr-FR").replace(/\s/g, ".");

function statusColor(pct: number): [number, number, number] {
  if (pct > 100) return [220, 38, 38];
  if (pct > 90) return [217, 119, 6];
  if (pct > 70) return [202, 138, 4];
  return [22, 163, 74];
}

export function generateBudgetPDF(data: BudgetExportData): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const consMap = new Map(data.consumption.map((c) => [c.budget_line_id, c]));
  const totalCons = data.consumption.reduce((s, c) => s + Number(c.montant_consomme || 0), 0);
  const totalPct = data.budget.montant_total > 0 ? (totalCons / data.budget.montant_total) * 100 : 0;

  doc.setFontSize(16); doc.setFont("helvetica", "bold");
  doc.text(data.budget.nom, 14, 18);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(`Programme : ${data.budget.project_nom || "-"}`, 14, 25);
  doc.text(`Devise : ${data.budget.devise} · Taux : ${data.budget.taux_change_xof} XOF · Statut : ${data.budget.status}`, 14, 30);
  doc.text(`Édité le ${new Date().toLocaleDateString("fr-FR")} · Karaté Pour Tous (KPT)`, 14, 35);

  // Synthèse
  autoTable(doc, {
    startY: 42,
    head: [["Indicateur", "Montant"]],
    body: [
      ["Budget total", `${fmt(data.budget.montant_total)} ${data.budget.devise}`],
      ["Consommé", `${fmt(totalCons)} ${data.budget.devise}`],
      ["Restant", `${fmt(data.budget.montant_total - totalCons)} ${data.budget.devise}`],
      ["Exécution", `${totalPct.toFixed(1)} %`],
    ],
    theme: "grid",
    headStyles: { fillColor: [30, 64, 175] },
    styles: { fontSize: 9 },
  });

  // Structure budgétaire
  const body: any[] = [];
  for (const cat of data.categories) {
    const catLines = data.lines.filter((l) => l.category_id === cat.id);
    const catCons = catLines.reduce((s, l) => s + Number(consMap.get(l.id)?.montant_consomme || 0), 0);
    const catPct = cat.montant_prevu > 0 ? (catCons / cat.montant_prevu) * 100 : 0;
    body.push([{ content: `${cat.code || ""} ${cat.libelle}`, colSpan: 1, styles: { fontStyle: "bold", fillColor: [240, 244, 248] } },
      { content: fmt(cat.montant_prevu), styles: { fontStyle: "bold", fillColor: [240, 244, 248], halign: "right" } },
      { content: fmt(catCons), styles: { fontStyle: "bold", fillColor: [240, 244, 248], halign: "right" } },
      { content: fmt(cat.montant_prevu - catCons), styles: { fontStyle: "bold", fillColor: [240, 244, 248], halign: "right" } },
      { content: `${catPct.toFixed(0)}%`, styles: { fontStyle: "bold", fillColor: [240, 244, 248], halign: "right", textColor: statusColor(catPct) } },
    ]);
    for (const l of catLines) {
      const c = consMap.get(l.id);
      const cons = Number(c?.montant_consomme || 0);
      const pct = Number(c?.pct_consomme || 0);
      body.push([
        `   ${l.libelle}${l.villes?.length ? ` (${l.villes.join(", ")})` : ""}`,
        { content: fmt(l.montant_prevu), styles: { halign: "right" } },
        { content: fmt(cons), styles: { halign: "right" } },
        { content: fmt(l.montant_prevu - cons), styles: { halign: "right" } },
        { content: `${pct.toFixed(0)}%`, styles: { halign: "right", textColor: statusColor(pct) } },
      ]);
    }
  }
  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [["Rubrique / Ligne", `Prévu (${data.budget.devise})`, "Consommé", "Restant", "%"]],
    body,
    theme: "striped",
    headStyles: { fillColor: [30, 64, 175] },
    styles: { fontSize: 8 },
    columnStyles: { 0: { cellWidth: 80 } },
  });

  // Dépenses par rubrique
  doc.addPage();
  doc.setFontSize(14); doc.setFont("helvetica", "bold");
  doc.text("Détail des dépenses imputées", 14, 18);

  let y = 24;
  for (const cat of data.categories) {
    const catLineIds = new Set(data.lines.filter((l) => l.category_id === cat.id).map((l) => l.id));
    const catAllocs = data.allocations.filter((a) => catLineIds.has(a.budget_line_id));
    if (catAllocs.length === 0) continue;
    const lineLabel = new Map(data.lines.filter((l) => catLineIds.has(l.id)).map((l) => [l.id, l.libelle]));
    autoTable(doc, {
      startY: y,
      head: [[{ content: `${cat.code || ""} ${cat.libelle}`, colSpan: 5, styles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" } }]],
      body: [],
      theme: "plain",
    });
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      head: [["Date", "Référence", "Bénéficiaire", "Motif / Ligne", `Montant (${data.budget.devise})`]],
      body: catAllocs.map((a) => [
        new Date(a.payment.date_paiement).toLocaleDateString("fr-FR"),
        a.payment.reference,
        a.payment.beneficiaire_nom,
        `${a.payment.motif}\n→ ${lineLabel.get(a.budget_line_id) || ""}`,
        fmt(a.montant_alloue_devise_budget ?? a.montant_alloue),
      ]),
      theme: "grid",
      headStyles: { fillColor: [241, 245, 249], textColor: 20 },
      styles: { fontSize: 8, cellPadding: 1.5 },
      columnStyles: { 4: { halign: "right" } },
    });
    y = (doc as any).lastAutoTable.finalY + 4;
    if (y > 260) { doc.addPage(); y = 18; }
  }

  if (data.unallocated.length > 0) {
    doc.addPage();
    doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("Dépenses non imputées", 14, 18);
    autoTable(doc, {
      startY: 22,
      head: [["Date", "Référence", "Bénéficiaire", "Motif", "Montant"]],
      body: data.unallocated.map((p) => [
        new Date(p.date_paiement).toLocaleDateString("fr-FR"),
        p.reference, p.beneficiaire_nom, p.motif, `${fmt(p.montant)} ${p.devise}`,
      ]),
      theme: "grid",
      styles: { fontSize: 8 },
    });
  }

  // Footer pages
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setFont("helvetica", "italic"); doc.setTextColor(120);
    doc.text(`KPT · ${data.budget.nom} · page ${i}/${pages}`, 14, 290);
  }
  return doc;
}

export function generateBudgetXLSX(data: BudgetExportData): Uint8Array {
  const consMap = new Map(data.consumption.map((c) => [c.budget_line_id, c]));
  const wb = XLSX.utils.book_new();

  const synth: any[][] = [["Rubrique / Ligne", `Prévu (${data.budget.devise})`, "Consommé", "Restant", "% Exécution"]];
  for (const cat of data.categories) {
    const catLines = data.lines.filter((l) => l.category_id === cat.id);
    const catCons = catLines.reduce((s, l) => s + Number(consMap.get(l.id)?.montant_consomme || 0), 0);
    synth.push([`${cat.code || ""} ${cat.libelle}`, cat.montant_prevu, catCons, cat.montant_prevu - catCons,
      cat.montant_prevu > 0 ? (catCons / cat.montant_prevu) : 0]);
    for (const l of catLines) {
      const c = consMap.get(l.id);
      const cons = Number(c?.montant_consomme || 0);
      synth.push([`   ${l.libelle}`, l.montant_prevu, cons, l.montant_prevu - cons, l.montant_prevu > 0 ? cons / l.montant_prevu : 0]);
    }
  }
  const ws1 = XLSX.utils.aoa_to_sheet(synth);
  ws1["!cols"] = [{ wch: 50 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Synthèse");

  const lineLabel = new Map(data.lines.map((l) => [l.id, l.libelle]));
  const depRows: any[][] = [["Date", "Référence", "Bénéficiaire", "Motif", "Ligne budgétaire", "Source", "Confiance", "Montant origine", "Devise origine", `Montant ${data.budget.devise}`]];
  for (const a of data.allocations) {
    depRows.push([
      a.payment.date_paiement, a.payment.reference, a.payment.beneficiaire_nom, a.payment.motif,
      lineLabel.get(a.budget_line_id) || "", a.source, a.confidence ?? "",
      a.payment.montant, a.payment.devise, a.montant_alloue_devise_budget ?? a.montant_alloue,
    ]);
  }
  const ws2 = XLSX.utils.aoa_to_sheet(depRows);
  ws2["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 40 }, { wch: 30 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 8 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Dépenses");

  const unRows: any[][] = [["Date", "Référence", "Bénéficiaire", "Motif", "Montant", "Devise"]];
  data.unallocated.forEach((p) => unRows.push([p.date_paiement, p.reference, p.beneficiaire_nom, p.motif, p.montant, p.devise]));
  const ws3 = XLSX.utils.aoa_to_sheet(unRows);
  ws3["!cols"] = [{ wch: 12 }, { wch: 18 }, { wch: 25 }, { wch: 40 }, { wch: 15 }, { wch: 8 }];
  XLSX.utils.book_append_sheet(wb, ws3, "Non imputé");

  return XLSX.write(wb, { type: "array", bookType: "xlsx" });
}