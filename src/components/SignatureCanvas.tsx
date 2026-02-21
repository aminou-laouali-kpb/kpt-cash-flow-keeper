import { useRef, useState } from "react";
import SignaturePad from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

interface SignatureCanvasProps {
  onConfirm: (dataUrl: string) => void;
  onClear?: () => void;
}

export function SignatureCanvas({ onConfirm, onClear }: SignatureCanvasProps) {
  const sigRef = useRef<SignaturePad>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigRef.current?.clear();
    setIsEmpty(true);
    onClear?.();
  };

  const handleConfirm = () => {
    if (sigRef.current && !sigRef.current.isEmpty()) {
      const dataUrl = sigRef.current.getTrimmedCanvas().toDataURL("image/png");
      onConfirm(dataUrl);
    }
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg bg-background overflow-hidden touch-none">
        <SignaturePad
          ref={sigRef}
          canvasProps={{
            className: "w-full h-48",
            style: { width: "100%", height: "192px" },
          }}
          onBegin={() => setIsEmpty(false)}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={handleClear}>
          <Eraser className="h-4 w-4 mr-1" /> Effacer
        </Button>
        <Button size="sm" onClick={handleConfirm} disabled={isEmpty}>
          <Check className="h-4 w-4 mr-1" /> Valider
        </Button>
      </div>
    </div>
  );
}
