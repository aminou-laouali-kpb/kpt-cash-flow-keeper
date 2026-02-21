import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { useSignatureByToken, useSignatureActions } from "@/hooks/useSignatures";
import cachetImg from "@/assets/Cachet_KPT.png";

export default function SignaturePage() {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading } = useSignatureByToken(token);
  const { signViaToken, refuseViaToken } = useSignatureActions();
  const [mode, setMode] = useState<"view" | "refuse">("view");
  const [refusalReason, setRefusalReason] = useState("");
  const [done, setDone] = useState<"signed" | "refused" | null>(null);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Lien invalide</h2>
          <p className="text-muted-foreground">Ce lien de signature est invalide ou a expiré.</p>
        </CardContent>
      </Card>
    </div>
  );

  if (data.status !== "pending" || done) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-6 text-center">
          {(data.status === "signed" || done === "signed") ? (
            <>
              <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-4" />
              <h2 className="text-xl font-bold mb-2">Signature enregistrée</h2>
              <p className="text-muted-foreground">Merci, votre signature a bien été prise en compte.</p>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
              <h2 className="text-xl font-bold mb-2">
                {data.status === "expired" ? "Lien expiré" : "Signature refusée"}
              </h2>
              <p className="text-muted-foreground">
                {data.status === "expired" ? "Ce lien a expiré. Contactez l'association." : "Votre refus a été enregistré."}
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const payment = (data as any).payments;

  const handleSign = async (dataUrl: string) => {
    await signViaToken({
      token: token!,
      payment_id: data.payment_id,
      signer_name: payment.beneficiaire_nom,
      signature_image_url: dataUrl,
    });
    setDone("signed");
  };

  const handleRefuse = async () => {
    await refuseViaToken({ token: token!, reason: refusalReason });
    setDone("refused");
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <img src={cachetImg} alt="KPT" className="h-16 mx-auto mb-2" />
          <h1 className="text-xl font-bold">Signature de fiche de paiement</h1>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Résumé de la fiche</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Référence</span><span className="font-medium">{payment.reference}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Montant</span><span className="font-medium">{Number(payment.montant).toLocaleString("fr-FR")} {payment.devise}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-medium">{payment.date_paiement}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Bénéficiaire</span><span className="font-medium">{payment.beneficiaire_nom}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Motif</span><span className="font-medium">{payment.motif}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Projet</span><span className="font-medium">{(payment as any).projects?.nom || "—"}</span></div>
          </CardContent>
        </Card>

        {mode === "view" ? (
          <Card>
            <CardHeader><CardTitle className="text-base">Votre signature</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                En signant, vous confirmez avoir reçu le montant indiqué ci-dessus.
              </p>
              <SignatureCanvas onConfirm={handleSign} />
              <Button variant="outline" className="w-full" onClick={() => setMode("refuse")}>
                <XCircle className="h-4 w-4 mr-2" /> Je refuse de signer
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Refus de signature</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Motif du refus (optionnel)"
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setMode("view")}>Retour</Button>
                <Button variant="destructive" className="flex-1" onClick={handleRefuse}>Confirmer le refus</Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
