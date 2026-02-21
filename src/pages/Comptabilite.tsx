import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function Comptabilite() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Comptabilité</h1>
        <p className="text-muted-foreground mt-1">Grand livre et exports</p>
      </div>

      <Card className="border-border">
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <FileText className="h-12 w-12 mb-3 opacity-30" />
            <p>Module comptabilité</p>
            <p className="text-sm">Disponible dans la Phase 9</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
