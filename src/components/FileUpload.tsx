import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type UploadedFile = {
  file_url: string;
  file_name: string;
  file_type: string;
};

interface FileUploadProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
  existingFiles?: UploadedFile[];
  maxFiles?: number;
  accept?: string;
}

export function FileUpload({ onFilesUploaded, existingFiles = [], maxFiles = 5, accept = "image/*,application/pdf" }: FileUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (files.length + selectedFiles.length > maxFiles) {
      toast({ title: "Erreur", description: `Maximum ${maxFiles} fichiers`, variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const uploaded: UploadedFile[] = [];
      for (const file of selectedFiles) {
        const ext = file.name.split(".").pop();
        const path = `documents/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error } = await supabase.storage.from("kpt-files").upload(path, file);
        if (error) throw error;
        const { data } = supabase.storage.from("kpt-files").getPublicUrl(path);
        uploaded.push({ file_url: data.publicUrl, file_name: file.name, file_type: file.type });
      }
      const newFiles = [...files, ...uploaded];
      setFiles(newFiles);
      onFilesUploaded(newFiles);
    } catch (err: any) {
      toast({ title: "Erreur d'upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [files, maxFiles, onFilesUploaded, toast]);

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesUploaded(newFiles);
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
        <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-2">
          {uploading ? "Upload en cours..." : "Glissez vos fichiers ou cliquez pour parcourir"}
        </p>
        <Button variant="outline" size="sm" disabled={uploading} asChild>
          <label className="cursor-pointer">
            Parcourir
            <input type="file" className="hidden" multiple accept={accept} onChange={handleUpload} />
          </label>
        </Button>
      </div>
      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li key={i} className="flex items-center gap-2 p-2 bg-muted rounded-lg text-sm">
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{f.file_name}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
