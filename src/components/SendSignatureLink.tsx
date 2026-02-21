import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, MessageCircle, Mail, Loader2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SendSignatureLinkProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paymentId: string;
  beneficiaireEmail?: string | null;
  beneficiaireTelephone?: string | null;
  onCreateRequest: (sentVia: string) => Promise<{ token: string }>;
}

export function SendSignatureLink({
  open, onOpenChange, paymentId,
  beneficiaireEmail, beneficiaireTelephone,
  onCreateRequest,
}: SendSignatureLinkProps) {
  const { toast } = useToast();
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLink = async (via: string) => {
    setLoading(true);
    try {
      const req = await onCreateRequest(via);
      const url = `${window.location.origin}/signer/${req.token}`;
      setLink(url);
      return url;
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    const url = link || await generateLink("copie");
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast({ title: "Lien copié !" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = async () => {
    const url = link || await generateLink("whatsapp");
    const phone = beneficiaireTelephone?.replace(/\s/g, "") || "";
    const msg = encodeURIComponent(`Bonjour, veuillez signer votre fiche de paiement ici : ${url}`);
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const handleEmail = async () => {
    const url = link || await generateLink("email");
    const subject = encodeURIComponent("Signature de votre fiche de paiement");
    const body = encodeURIComponent(`Bonjour,\n\nVeuillez signer votre fiche de paiement en cliquant sur ce lien :\n${url}\n\nCordialement`);
    window.open(`mailto:${beneficiaireEmail || ""}?subject=${subject}&body=${body}`);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) { setLink(null); setCopied(false); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Envoyer le lien de signature</DialogTitle>
          <DialogDescription>Choisissez comment envoyer le lien au bénéficiaire.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-3">
            <Button variant="outline" className="w-full justify-start" onClick={handleCopy}>
              {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
              {copied ? "Copié !" : "Copier le lien"}
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleWhatsApp}>
              <MessageCircle className="h-4 w-4 mr-2" /> Envoyer via WhatsApp
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={handleEmail}>
              <Mail className="h-4 w-4 mr-2" /> Envoyer par Email
            </Button>
            {link && (
              <div className="bg-muted p-3 rounded text-xs break-all font-mono">{link}</div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
