import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beneficiaireName: string;
  onSign: (name: string, signatureDataUrl: string) => Promise<void>;
}

export function SignatureDialog({ open, onOpenChange, beneficiaireName, onSign }: SignatureDialogProps) {
  const [name, setName] = useState(beneficiaireName);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (dataUrl: string) => {
    setLoading(true);
    try {
      await onSign(name, dataUrl);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Signature du bénéficiaire</DialogTitle>
          <DialogDescription>Le bénéficiaire signe sur place pour confirmer la réception.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>Nom du signataire</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom complet" />
            </div>
            <div>
              <Label>Signature</Label>
              <p className="text-xs text-muted-foreground mb-2">Dessinez votre signature ci-dessous</p>
              <SignatureCanvas onConfirm={handleConfirm} />
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
