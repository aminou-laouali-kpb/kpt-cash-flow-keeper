import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-muted text-muted-foreground" },
  en_attente_signature: { label: "En attente", className: "bg-warning/20 text-warning" },
  signe: { label: "Signé", className: "bg-secondary/20 text-secondary" },
  a_re_signer: { label: "À re-signer", className: "bg-destructive/20 text-destructive" },
  actif: { label: "Actif", className: "bg-secondary/20 text-secondary" },
  cloture: { label: "Clôturé", className: "bg-muted text-muted-foreground" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, className: "" };
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", config.className)}>
      {config.label}
    </Badge>
  );
}
