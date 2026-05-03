import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Loader2, Trash2, Download, PenTool, Send, CheckCircle, Clock, XCircle } from "lucide-react";
import { usePayment, usePayments } from "@/hooks/usePayments";
import { useSettings } from "@/hooks/useSettings";
import { usePaymentSignatures, useSignatureRequests, useSignatureActions } from "@/hooks/useSignatures";
import { usePaymentDocuments } from "@/hooks/usePaymentDocuments";
import { FileUpload } from "@/components/FileUpload";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { generatePaymentPDF } from "@/lib/generatePaymentPDF";
import { SignatureDialog } from "@/components/SignatureDialog";
import { SendSignatureLink } from "@/components/SendSignatureLink";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";

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

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}

export default function PaiementDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: payment, isLoading } = usePayment(id);
  const { deletePayment } = usePayments();
  const { settings } = useSettings();
  const { data: signatures = [] } = usePaymentSignatures(id);
  const { data: requests = [] } = useSignatureRequests(id);
  const { createSignature, createSignatureRequest } = useSignatureActions();
  const { documents, addDocument, deleteDocument } = usePaymentDocuments(id);
  const { updatePayment } = usePayments();

  const [signDialogOpen, setSignDialogOpen] = useState(false);
  const [sendLinkOpen, setSendLinkOpen] = useState(false);
  const [proofAsSignature, setProofAsSignature] = useState(true);

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!payment) return <div className="text-center py-12 text-muted-foreground">Paiement introuvable</div>;

  const handleDelete = async () => {
    await deletePayment(payment.id);
    navigate("/paiements");
  };

  const beneficiaireSig = signatures.find(s => s.signer_type === "beneficiaire" && s.is_valid);
  const pendingRequest = requests.find(r => r.status === "pending");
  const proofDocs = documents.filter(d => d.type_piece === "justificatif_signature");
  const hasProofSignature = proofDocs.length > 0;

  const handleOnSiteSign = async (name: string, dataUrl: string) => {
    // Upload signature image
    const fileName = `signatures/beneficiaire_${payment.id}_${Date.now()}.png`;
    const blob = await (await fetch(dataUrl)).blob();
    const { error: uploadError } = await supabase.storage.from("kpt-files").upload(fileName, blob, { contentType: "image/png" });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from("kpt-files").getPublicUrl(fileName);

    await createSignature({
      payment_id: payment.id,
      signer_type: "beneficiaire",
      signer_name: name,
      signature_image_url: urlData.publicUrl,
    });
  };

  const handleCreateRequest = async (sentVia: string) => {
    const result = await createSignatureRequest({ payment_id: payment.id, sent_via: sentVia });
    return { token: result.token };
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/paiements")}><ArrowLeft className="h-5 w-5" /></Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{payment.reference}</h1>
            <StatusBadge status={payment.statut} />
          </div>
          <p className="text-muted-foreground text-sm">
            {payment.type === "recu_importe" ? "Reçu importé" : "Fiche manuelle KPT"} · v{payment.version_courante}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate(`/paiements/${id}/modifier`)}>
          <Edit className="h-4 w-4 mr-1" /> Modifier
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Montant</p><p className="text-xl font-bold">{Number(payment.montant).toLocaleString("fr-FR")} {payment.devise}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Date</p><p className="text-xl font-bold">{payment.date_paiement}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Catégorie</p><p className="text-lg font-medium">{categoryLabels[payment.categorie] || payment.categorie}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-muted-foreground">Mode</p><p className="text-lg font-medium">{modeLabels[payment.mode_paiement] || payment.mode_paiement}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Bénéficiaire</CardTitle></CardHeader>
        <CardContent>
          <InfoRow label="Nom" value={payment.beneficiaire_nom} />
          <InfoRow label="Téléphone" value={payment.beneficiaire_telephone} />
          <InfoRow label="Email" value={payment.beneficiaire_email} />
          <InfoRow label="Adresse" value={payment.beneficiaire_adresse} />
          <InfoRow label="Pièce d'identité" value={payment.beneficiaire_piece_type ? `${payment.beneficiaire_piece_type} — ${payment.beneficiaire_piece_numero}` : null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Détails du paiement</CardTitle></CardHeader>
        <CardContent>
          <InfoRow label="Projet" value={(payment as any).projects?.nom} />
          <InfoRow label="Motif" value={payment.motif} />
          <InfoRow label="Lieu" value={payment.lieu} />
          <InfoRow label="Référence transaction" value={payment.reference_transaction} />
          <InfoRow label="Effectué par" value={payment.personne_effectuant} />
          <InfoRow label="Commentaire" value={payment.commentaire} />
          <InfoRow label="Motif absence reçu" value={payment.motif_absence_recu} />
        </CardContent>
      </Card>

      {/* Signatures Section */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Signatures</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {hasProofSignature && (
            <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-900">
              <p className="font-medium">Justificatif fourni — signatures non requises</p>
              <p className="text-xs">Le PDF utilisera le justificatif joint en lieu et place des signatures.</p>
            </div>
          )}
          {!hasProofSignature && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Président */}
            <div className="border rounded-lg p-4 text-center space-y-2">
              <p className="text-sm font-medium">{settings?.president_fonction || "Président"}</p>
              <p className="text-xs text-muted-foreground">{settings?.president_nom || "—"}</p>
              {settings?.president_signature_url ? (
                <img src={settings.president_signature_url} alt="Signature Président" className="h-16 mx-auto object-contain" />
              ) : (
                <div className="h-16 flex items-center justify-center text-muted-foreground text-xs">Non configurée</div>
              )}
            </div>

            {/* Bénéficiaire */}
            <div className="border rounded-lg p-4 text-center space-y-2">
              <p className="text-sm font-medium">Bénéficiaire</p>
              <p className="text-xs text-muted-foreground">{payment.beneficiaire_nom}</p>
              {beneficiaireSig ? (
                <>
                  <img src={beneficiaireSig.signature_image_url || ""} alt="Signature" className="h-16 mx-auto object-contain" />
                  <div className="flex items-center justify-center gap-1 text-xs text-green-600">
                    <CheckCircle className="h-3 w-3" /> Signé
                  </div>
                </>
              ) : pendingRequest ? (
                <div className="h-16 flex flex-col items-center justify-center gap-1">
                  <Clock className="h-5 w-5 text-amber-500" />
                  <span className="text-xs text-muted-foreground">En attente</span>
                </div>
              ) : (
                <div className="h-16 flex items-center justify-center text-muted-foreground text-xs">Non signé</div>
              )}
            </div>

            {/* Trésorière */}
            <div className="border rounded-lg p-4 text-center space-y-2">
              <p className="text-sm font-medium">{settings?.tresoriere_fonction || "Trésorière"}</p>
              <p className="text-xs text-muted-foreground">{settings?.tresoriere_nom || "—"}</p>
              {settings?.tresoriere_signature_url ? (
                <img src={settings.tresoriere_signature_url} alt="Signature Trésorière" className="h-16 mx-auto object-contain" />
              ) : (
                <div className="h-16 flex items-center justify-center text-muted-foreground text-xs">Non configurée</div>
              )}
            </div>
          </div>
          )}

          {!beneficiaireSig && !hasProofSignature && (
            <div className="flex gap-3 pt-2">
              <Button size="sm" onClick={() => setSignDialogOpen(true)}>
                <PenTool className="h-4 w-4 mr-1" /> Signer sur place
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSendLinkOpen(true)}>
                <Send className="h-4 w-4 mr-1" /> Envoyer lien de signature
              </Button>
            </div>
          )}

          {/* Justificatifs */}
          <div className="space-y-3 pt-4 border-t">
            <p className="text-sm font-medium">Justificatifs / pièces jointes</p>
            {documents.length > 0 ? (
              <ul className="space-y-2">
                {documents.map(d => (
                  <li key={d.id} className="flex items-center gap-2 text-sm bg-muted rounded p-2">
                    <a href={d.file_url} target="_blank" rel="noreferrer" className="flex-1 truncate underline">{d.file_name}</a>
                    {d.type_piece === "justificatif_signature" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-800">tient lieu de signature</span>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteDocument(d.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Aucun document joint.</p>
            )}
            <FileUpload
              onFilesUploaded={async (files) => {
                const last = files[files.length - 1];
                if (!last) return;
                const already = documents.some(d => d.file_url === last.file_url);
                if (already) return;
                await addDocument({
                  payment_id: payment.id,
                  file_url: last.file_url,
                  file_name: last.file_name,
                  file_type: last.file_type,
                  type_piece: proofAsSignature ? "justificatif_signature" : "recu",
                });
                if (proofAsSignature && payment.statut !== "signe") {
                  await updatePayment({ id: payment.id, statut: "signe" } as any);
                }
              }}
              existingFiles={[]}
            />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={proofAsSignature} onCheckedChange={(v) => setProofAsSignature(!!v)} />
              <span>Marquer comme justificatif tenant lieu de signature</span>
            </label>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => payment && settings && generatePaymentPDF(payment, settings, (payment as any).projects?.nom, beneficiaireSig?.signature_image_url, proofDocs)}>
          <Download className="h-4 w-4 mr-2" /> Télécharger PDF
        </Button>
      </div>

      <SignatureDialog
        open={signDialogOpen}
        onOpenChange={setSignDialogOpen}
        beneficiaireName={payment.beneficiaire_nom}
        onSign={handleOnSiteSign}
      />

      <SendSignatureLink
        open={sendLinkOpen}
        onOpenChange={setSendLinkOpen}
        paymentId={payment.id}
        beneficiaireEmail={payment.beneficiaire_email}
        beneficiaireTelephone={payment.beneficiaire_telephone}
        onCreateRequest={handleCreateRequest}
      />
    </div>
  );
}
