import { Lock, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminFeatureAccessMatrixItem } from "@/hooks/useAdminFeatureAccessMatrix";

type AdminFeatureAccessMatrixPanelProps = {
  items: AdminFeatureAccessMatrixItem[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
};

const getBooleanLabel = (value: boolean) => (value ? "Açık" : "Kapalı");

const getBackendEnforcementLabel = (value: boolean) => (value ? "Gerekli" : "Planlı / düşük");

const getContentRiskLabel = (value: AdminFeatureAccessMatrixItem["content_risk"]) => {
  if (value === "none") return "Yok";
  if (value === "low") return "Düşük";
  if (value === "medium") return "Orta";
  return "Yüksek";
};

const getStatusLabel = (value: boolean) => (value ? "Aktif" : "Pasif");

export const AdminFeatureAccessMatrixPanel = ({
  items,
  isLoading,
  error,
  onRetry,
}: AdminFeatureAccessMatrixPanelProps) => {
  return (
    <Card className="rounded-none border-border/70 shadow-none">
      <CardHeader className="gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="text-base font-medium tracking-wide">Erişim Matrisi</CardTitle>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Beginner ve Plus üyeliklerin hangi özelliklere erişebileceğini gösteren read-only ekran. Bu ekran
              V1-C3b'de canlı RPC verisine bağlanmıştır. Değişiklik yapma yetkisi V1-C4'ten önce eklenmeyecektir.
            </p>
          </div>
          <Badge variant="outline" className="rounded-none font-normal">
            Read-only
          </Badge>
        </div>

        <Alert className="rounded-none border-border/70 bg-muted/20">
          <Lock className="h-4 w-4" />
          <AlertTitle className="text-sm font-medium">Salt görünüm</AlertTitle>
          <AlertDescription className="text-sm leading-6 text-muted-foreground">
            Bu ekranda değişiklik yapılamaz. Tablo yalnızca canlı erişim verisini okur.
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5 pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Aşağıda feature key bazlı güncel erişim matrisi yer alır.</p>
          <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={isLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
        </div>

        {isLoading ? (
          <div className="border border-border/70 px-4 py-6 text-sm text-muted-foreground">
            Erişim matrisi yükleniyor...
          </div>
        ) : error ? (
          <div className="space-y-3 border border-border/70 px-4 py-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Tekrar dene
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="border border-border/70 px-4 py-6 text-sm text-muted-foreground">
            Erişim matrisi kaydı bulunamadı.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Özellik</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Beginner</TableHead>
                  <TableHead>Plus</TableHead>
                  <TableHead>Backend enforcement</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Durum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.feature_key}>
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div>{item.label}</div>
                        <div className="text-xs text-muted-foreground">{item.feature_key}</div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.category}</TableCell>
                    <TableCell>{getBooleanLabel(item.beginner_enabled)}</TableCell>
                    <TableCell>{getBooleanLabel(item.plus_enabled)}</TableCell>
                    <TableCell>{getBackendEnforcementLabel(item.backend_enforcement_required)}</TableCell>
                    <TableCell>{getContentRiskLabel(item.content_risk)}</TableCell>
                    <TableCell className="text-muted-foreground">{item.route_path ?? "—"}</TableCell>
                    <TableCell>{getStatusLabel(item.is_active)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
