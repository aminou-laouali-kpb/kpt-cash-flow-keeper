import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Loader2, Trash2, Download } from "lucide-react";
import { usePayment, usePayments } from "@/hooks/usePayments";
import { useSettings } from "@/hooks/useSettings";
import { StatusBadge } from "@/components/StatusBadge";
import { generatePaymentPDF } from "@/lib/generatePaymentPDF";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!payment) return <div className="text-center py-12 text-muted-foreground">Paiement introuvable</div>;

  const handleDelete = async () => {
    await deletePayment(payment.id);
    navigate("/paiements");
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

      <div className="flex gap-3">
        <Button variant="outline" onClick={() => payment && settings && generatePaymentPDF(payment, settings, (payment as any).projects?.nom)}>
          <Download className="h-4 w-4 mr-2" /> Télécharger PDF
        </Button>
      </div>
    </div>
  );
}
