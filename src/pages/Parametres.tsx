import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Save, Upload, X } from "lucide-react";
import { useSettings } from "@/hooks/useSettings";

const schema = z.object({
  nom: z.string().min(1, "Requis").max(200),
  adresse: z.string().max(500).optional().or(z.literal("")),
  telephone: z.string().max(30).optional().or(z.literal("")),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
  president_nom: z.string().max(200).optional().or(z.literal("")),
  president_fonction: z.string().max(200).optional().or(z.literal("")),
  tresoriere_nom: z.string().max(200).optional().or(z.literal("")),
  tresoriere_fonction: z.string().max(200).optional().or(z.literal("")),
  devise_defaut: z.string(),
  prefixe_numerotation: z.string().min(1).max(20),
  mention_legale: z.string().max(1000).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

function ImageUpload({ label, currentUrl, onUpload }: { label: string; currentUrl: string | null; onUpload: (file: File) => Promise<void> }) {
  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { setPreview(currentUrl); }, [currentUrl]);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try { await onUpload(file); } finally { setUploading(false); }
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      {preview && (
        <div className="relative inline-block">
          <img src={preview} alt={label} className="h-20 w-20 object-contain rounded-lg border border-border bg-muted" />
          <Button variant="ghost" size="icon" className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground" onClick={() => setPreview(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
      <Button variant="outline" size="sm" disabled={uploading} asChild>
        <label className="cursor-pointer">
          <Upload className="h-3 w-3 mr-1" />
          {uploading ? "Upload..." : "Choisir un fichier"}
          <input type="file" className="hidden" accept="image/*" onChange={handleChange} />
        </label>
      </Button>
    </div>
  );
}

export default function Parametres() {
  const { settings, isLoading, updateSettings, isUpdating, uploadFile } = useSettings();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nom: "", adresse: "", telephone: "", email: "",
      president_nom: "", president_fonction: "Président",
      tresoriere_nom: "", tresoriere_fonction: "Trésorière",
      devise_defaut: "XOF", prefixe_numerotation: "KPT-PAY",
      mention_legale: "",
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        nom: settings.nom || "",
        adresse: settings.adresse || "",
        telephone: settings.telephone || "",
        email: settings.email || "",
        president_nom: settings.president_nom || "",
        president_fonction: settings.president_fonction || "Président",
        tresoriere_nom: settings.tresoriere_nom || "",
        tresoriere_fonction: settings.tresoriere_fonction || "Trésorière",
        devise_defaut: settings.devise_defaut || "XOF",
        prefixe_numerotation: settings.prefixe_numerotation || "KPT-PAY",
        mention_legale: settings.mention_legale || "",
      });
    }
  }, [settings, form]);

  const onSubmit = (values: FormValues) => {
    updateSettings(values as any);
  };

  const handleLogoUpload = async (file: File) => {
    const url = await uploadFile(file, "logo");
    updateSettings({ logo_url: url } as any);
  };

  const handlePresidentSignature = async (file: File) => {
    const url = await uploadFile(file, "signatures");
    updateSettings({ president_signature_url: url } as any);
  };

  const handleTresoriereSignature = async (file: File) => {
    const url = await uploadFile(file, "signatures");
    updateSettings({ tresoriere_signature_url: url } as any);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Paramètres</h1>
        <p className="text-muted-foreground mt-1">Configuration de l'association KPT</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Informations générales</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="nom" render={({ field }) => (
                <FormItem><FormLabel>Nom de l'association</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="adresse" render={({ field }) => (
                <FormItem><FormLabel>Adresse</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="telephone" render={({ field }) => (
                  <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Logo</CardTitle></CardHeader>
            <CardContent>
              <ImageUpload label="Logo de l'association" currentUrl={settings?.logo_url || null} onUpload={handleLogoUpload} />
            </CardContent>
          </Card>

          {/* Président */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Président</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="president_nom" render={({ field }) => (
                  <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="president_fonction" render={({ field }) => (
                  <FormItem><FormLabel>Fonction</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <ImageUpload label="Signature du Président" currentUrl={settings?.president_signature_url || null} onUpload={handlePresidentSignature} />
            </CardContent>
          </Card>

          {/* Trésorière */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Trésorière</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="tresoriere_nom" render={({ field }) => (
                  <FormItem><FormLabel>Nom</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tresoriere_fonction" render={({ field }) => (
                  <FormItem><FormLabel>Fonction</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <ImageUpload label="Signature de la Trésorière" currentUrl={settings?.tresoriere_signature_url || null} onUpload={handleTresoriereSignature} />
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="devise_defaut" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Devise par défaut</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="XOF">XOF (Franc CFA)</SelectItem>
                        <SelectItem value="EUR">EUR (Euro)</SelectItem>
                        <SelectItem value="USD">USD (Dollar)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="prefixe_numerotation" render={({ field }) => (
                  <FormItem><FormLabel>Préfixe numérotation</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="mention_legale" render={({ field }) => (
                <FormItem><FormLabel>Mention légale (pied de page)</FormLabel><FormControl><Textarea rows={3} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </CardContent>
          </Card>

          <Button type="submit" disabled={isUpdating} className="w-full sm:w-auto">
            {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Sauvegarder
          </Button>
        </form>
      </Form>
    </div>
  );
}
