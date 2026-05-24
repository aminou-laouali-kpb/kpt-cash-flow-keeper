import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ArrowRight, Loader2, Save, Receipt, FileText, AlertTriangle, Trash2 } from "lucide-react";
import { usePayments, usePayment } from "@/hooks/usePayments";
import { usePaymentDocuments } from "@/hooks/usePaymentDocuments";
import { useProjects } from "@/hooks/useProjects";
import { FileUpload } from "@/components/FileUpload";
import { SignedLink } from "@/components/SignedLink";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  { value: "fournitures", label: "Fournitures" },
  { value: "transport", label: "Transport" },
  { value: "restauration", label: "Restauration" },
  { value: "hebergement", label: "Hébergement" },
  { value: "communication", label: "Communication" },
  { value: "equipement_sportif", label: "Équipement sportif" },
  { value: "location_salle", label: "Location salle" },
  { value: "honoraires", label: "Honoraires" },
  { value: "frais_bancaires", label: "Frais bancaires" },
  { value: "assurance", label: "Assurance" },
  { value: "formation", label: "Formation" },
  { value: "evenement", label: "Événement" },
  { value: "autre", label: "Autre" },
];

const modes = [
  { value: "especes", label: "Espèces" },
  { value: "virement", label: "Virement" },
  { value: "cheque", label: "Chèque" },
  { value: "mobile_money", label: "MyNITA" },
  { value: "carte_bancaire", label: "Carte bancaire" },
  { value: "autre", label: "Autre" },
];

const schema = z.object({
  project_id: z.string().min(1, "Requis"),
  date_paiement: z.string().min(1, "Requis"),
  montant: z.coerce.number().positive("Montant positif requis"),
  devise: z.string().default("XOF"),
  categorie: z.string().min(1, "Requis"),
  mode_paiement: z.string().min(1, "Requis"),
  beneficiaire_nom: z.string().min(1, "Requis").max(200),
  motif: z.string().min(1, "Requis").max(500),
  // optional
  beneficiaire_telephone: z.string().max(30).optional().or(z.literal("")),
  beneficiaire_email: z.string().email().optional().or(z.literal("")),
  beneficiaire_adresse: z.string().max(500).optional().or(z.literal("")),
  beneficiaire_piece_type: z.string().optional().or(z.literal("")),
  beneficiaire_piece_numero: z.string().optional().or(z.literal("")),
  lieu: z.string().max(200).optional().or(z.literal("")),
  reference_transaction: z.string().optional().or(z.literal("")),
  commentaire: z.string().max(1000).optional().or(z.literal("")),
  personne_effectuant: z.string().max(200).optional().or(z.literal("")),
  motif_absence_recu: z.string().max(500).optional().or(z.literal("")),
  autorisation_reference: z.string().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export default function PaiementForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { id: editId } = useParams<{ id: string }>();
  const isEdit = !!editId;
  const initialType = searchParams.get("type") === "recu" ? "recu_importe" : null;
  const initialProject = searchParams.get("project") || "";

  const [step, setStep] = useState(0);
  const [paymentType, setPaymentType] = useState<"recu_importe" | "fiche_manuelle" | null>(
    initialType as any
  );
  const [uploadedFiles, setUploadedFiles] = useState<{ file_url: string; file_name: string; file_type: string }[]>([]);
  const [filesAreProof, setFilesAreProof] = useState(false);

  const { createPayment, updatePayment, isCreating } = usePayments();
  const { projects } = useProjects();
  const { data: existingPayment } = usePayment(editId);
  const { documents: existingDocs, deleteDocument } = usePaymentDocuments(editId);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      project_id: initialProject,
      date_paiement: new Date().toISOString().split("T")[0],
      montant: 0,
      devise: "XOF",
      categorie: "",
      mode_paiement: "especes",
      beneficiaire_nom: "",
      motif: "",
      beneficiaire_telephone: "",
      beneficiaire_email: "",
      beneficiaire_adresse: "",
      lieu: "",
      commentaire: "",
      personne_effectuant: "",
      motif_absence_recu: "",
    },
  });

  // Edit mode: preload values
  useEffect(() => {
    if (isEdit && existingPayment) {
      setPaymentType(existingPayment.type as any);
      setStep(1);
      form.reset({
        project_id: existingPayment.project_id || "",
        date_paiement: existingPayment.date_paiement,
        montant: Number(existingPayment.montant),
        devise: existingPayment.devise,
        categorie: existingPayment.categorie,
        mode_paiement: existingPayment.mode_paiement,
        beneficiaire_nom: existingPayment.beneficiaire_nom,
        beneficiaire_telephone: existingPayment.beneficiaire_telephone || "",
        beneficiaire_email: existingPayment.beneficiaire_email || "",
        beneficiaire_adresse: existingPayment.beneficiaire_adresse || "",
        beneficiaire_piece_type: existingPayment.beneficiaire_piece_type || "",
        beneficiaire_piece_numero: existingPayment.beneficiaire_piece_numero || "",
        motif: existingPayment.motif,
        lieu: existingPayment.lieu || "",
        reference_transaction: existingPayment.reference_transaction || "",
        commentaire: existingPayment.commentaire || "",
        personne_effectuant: existingPayment.personne_effectuant || "",
        motif_absence_recu: existingPayment.motif_absence_recu || "",
        autorisation_reference: existingPayment.autorisation_reference || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, existingPayment?.id]);

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      let paymentId: string | undefined = editId;
      if (isEdit && editId) {
        await updatePayment({ id: editId, ...values } as any);
      } else {
        const payment: any = await createPayment({ ...values, type: paymentType! } as any);
        paymentId = payment?.id;
      }

      if (uploadedFiles.length > 0 && paymentId) {
        for (const file of uploadedFiles) {
          await supabase.from("payment_documents").insert({
            payment_id: paymentId,
            file_url: file.file_url,
            file_name: file.file_name,
            file_type: file.file_type,
            type_piece: filesAreProof ? "justificatif_signature" : "recu",
          } as any);
        }
      }

      navigate(isEdit ? `/paiements/${editId}` : "/paiements");
    } catch {} finally {
      setIsSubmitting(false);
    }
  };

  // Step 0: Choose type (création uniquement)
  if (!isEdit && step === 0 && !paymentType) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/paiements")}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Nouveau paiement</h1>
            <p className="text-muted-foreground mt-1">Choisissez le type de paiement</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary" onClick={() => { setPaymentType("recu_importe"); setStep(1); }}>
            <CardContent className="pt-6 text-center">
              <Receipt className="h-12 w-12 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">Importer un reçu</h3>
              <p className="text-sm text-muted-foreground">Vous avez un reçu/facture à joindre</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary" onClick={() => { setPaymentType("fiche_manuelle"); setStep(1); }}>
            <CardContent className="pt-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-1">Fiche manuelle KPT</h3>
              <p className="text-sm text-muted-foreground">Créer un justificatif interne</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // If type was set from URL, auto-advance
  if (step === 0 && paymentType) setStep(1);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => {
          if (step > 1) { setStep(step - 1); return; }
          if (isEdit) { navigate(`/paiements/${editId}`); return; }
          if (paymentType === initialType) { navigate("/paiements"); return; }
          setPaymentType(null); setStep(0);
        }}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {isEdit ? `Modifier ${existingPayment?.reference || "le paiement"}` : "Nouveau paiement"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Étape {step} sur {paymentType === "recu_importe" ? 3 : 3} — {step === 1 ? "Informations principales" : step === 2 ? "Détails complémentaires" : "Documents & confirmation"}
          </p>
        </div>
      </div>

      {isEdit && existingPayment?.statut === "signe" && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>Cette fiche est déjà signée. Modifier un champ critique (montant, bénéficiaire, date, motif, projet) invalidera la signature du bénéficiaire.</p>
        </div>
      )}

      {/* Step indicators */}
      <div className="flex gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className={`h-1.5 flex-1 rounded-full ${s <= step ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Informations principales</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="project_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Projet *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner un projet" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>{p.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="date_paiement" render={({ field }) => (
                    <FormItem><FormLabel>Date *</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-2">
                    <FormField control={form.control} name="montant" render={({ field }) => (
                      <FormItem><FormLabel>Montant *</FormLabel><FormControl><Input type="number" step="1" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="devise" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Devise</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="XOF">XOF</SelectItem>
                            <SelectItem value="EUR">EUR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="categorie" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Catégorie *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger></FormControl>
                        <SelectContent>{categories.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="mode_paiement" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mode de paiement *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent>{modes.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="beneficiaire_nom" render={({ field }) => (
                  <FormItem><FormLabel>Bénéficiaire *</FormLabel><FormControl><Input placeholder="Nom du bénéficiaire" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="motif" render={({ field }) => (
                  <FormItem><FormLabel>Motif du paiement *</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Détails complémentaires</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="beneficiaire_telephone" render={({ field }) => (
                    <FormItem><FormLabel>Téléphone bénéficiaire</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="beneficiaire_email" render={({ field }) => (
                    <FormItem><FormLabel>Email bénéficiaire</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="beneficiaire_adresse" render={({ field }) => (
                  <FormItem><FormLabel>Adresse bénéficiaire</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="beneficiaire_piece_type" render={({ field }) => (
                    <FormItem><FormLabel>Type pièce d'identité</FormLabel><FormControl><Input placeholder="CNI, Passeport..." {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="beneficiaire_piece_numero" render={({ field }) => (
                    <FormItem><FormLabel>N° pièce d'identité</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="lieu" render={({ field }) => (
                  <FormItem><FormLabel>Lieu</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="reference_transaction" render={({ field }) => (
                  <FormItem><FormLabel>Référence transaction</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="personne_effectuant" render={({ field }) => (
                  <FormItem><FormLabel>Personne effectuant le paiement</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="commentaire" render={({ field }) => (
                  <FormItem><FormLabel>Commentaire</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                {paymentType === "fiche_manuelle" && (
                  <FormField control={form.control} name="motif_absence_recu" render={({ field }) => (
                    <FormItem><FormLabel>Motif d'absence de reçu</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                )}
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">
                {paymentType === "recu_importe" ? "Documents justificatifs" : "Confirmation"}
              </CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {isEdit && existingDocs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Pièces déjà jointes</p>
                    <ul className="space-y-1">
                      {existingDocs.map(d => (
                        <li key={d.id} className="flex items-center gap-2 text-sm bg-muted rounded p-2">
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <SignedLink src={d.file_url} className="flex-1 truncate underline">{d.file_name}</SignedLink>
                          {d.type_piece === "justificatif_signature" && (
                            <span className="text-xs text-green-700">tient lieu de signature</span>
                          )}
                          <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                            onClick={() => deleteDocument(d.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(paymentType === "recu_importe" || isEdit) && (
                  <>
                    <FileUpload onFilesUploaded={setUploadedFiles} />
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox checked={filesAreProof} onCheckedChange={(v) => setFilesAreProof(!!v)} />
                      <span>Ces documents tiennent lieu de signature (remplacent les signatures dans le PDF)</span>
                    </label>
                  </>
                )}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <h4 className="font-medium">Récapitulatif</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <span className="text-muted-foreground">Type</span>
                    <span>{paymentType === "recu_importe" ? "Reçu importé" : "Fiche manuelle"}</span>
                    <span className="text-muted-foreground">Montant</span>
                    <span className="font-medium">{Number(form.watch("montant")).toLocaleString("fr-FR")} {form.watch("devise")}</span>
                    <span className="text-muted-foreground">Bénéficiaire</span>
                    <span>{form.watch("beneficiaire_nom")}</span>
                    <span className="text-muted-foreground">Motif</span>
                    <span>{form.watch("motif")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3 justify-between">
            <Button type="button" variant="outline" onClick={() => step > 1 ? setStep(step - 1) : navigate("/paiements")}>
              {step > 1 ? "Précédent" : "Annuler"}
            </Button>
            {step < 3 ? (
              <Button type="button" onClick={async () => {
                if (step === 1) {
                  const valid = await form.trigger(["project_id", "date_paiement", "montant", "categorie", "mode_paiement", "beneficiaire_nom", "motif"]);
                  if (valid) setStep(2);
                } else {
                  setStep(3);
                }
              }}>
                Suivant <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button type="submit" disabled={isCreating || isSubmitting}>
                {(isCreating || isSubmitting) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {isEdit ? "Enregistrer les modifications" : "Créer le paiement"}
              </Button>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
}
