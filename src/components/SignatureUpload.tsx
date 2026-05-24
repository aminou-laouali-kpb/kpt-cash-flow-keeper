import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignatureCanvas } from "@/components/SignatureCanvas";
import { Upload, X, Pen } from "lucide-react";
import { signFileUrl } from "@/lib/storageUrl";

interface SignatureUploadProps {
  label: string;
  currentUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onDrawn: (dataUrl: string) => Promise<void>;
}

export function SignatureUpload({ label, currentUrl, onUpload, onDrawn }: SignatureUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [tab, setTab] = useState<string>("draw");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = await signFileUrl(currentUrl, 3600);
      if (!cancelled) setPreview(url);
    })();
    return () => { cancelled = true; };
  }, [currentUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try { await onUpload(file); } finally { setUploading(false); }
  };

  const handleDrawnConfirm = async (dataUrl: string) => {
    setPreview(dataUrl);
    setUploading(true);
    try { await onDrawn(dataUrl); } finally { setUploading(false); }
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt={label} className="h-20 w-auto object-contain rounded-lg border border-border bg-muted p-1" />
          <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground" onClick={() => setPreview(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw"><Pen className="h-3 w-3 mr-1" /> Dessiner</TabsTrigger>
          <TabsTrigger value="upload"><Upload className="h-3 w-3 mr-1" /> Importer</TabsTrigger>
        </TabsList>
        <TabsContent value="draw">
          <SignatureCanvas onConfirm={handleDrawnConfirm} />
        </TabsContent>
        <TabsContent value="upload">
          <Button variant="outline" size="sm" disabled={uploading} asChild>
            <label className="cursor-pointer">
              <Upload className="h-3 w-3 mr-1" />
              {uploading ? "Upload..." : "Choisir un fichier"}
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
