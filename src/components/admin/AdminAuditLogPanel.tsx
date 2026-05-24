import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminAuditLogPanelProps = {
  isSuperManager: boolean;
};

export const AdminAuditLogPanel = ({ isSuperManager }: AdminAuditLogPanelProps) => {
  if (!isSuperManager) {
    return null;
  }

  return (
    <Card className="rounded-none border-border/70 shadow-none">
      <CardHeader className="space-y-2 p-5">
        <CardTitle className="text-base font-medium tracking-wide">Audit Log</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Admin işlemleri burada read-only olarak görüntülenecek.
        </p>
      </CardHeader>
      <CardContent className="space-y-5 px-5 pb-5 pt-0">
        <div className="grid gap-3 lg:grid-cols-6">
          <Select value="all" disabled>
            <SelectTrigger className="rounded-none lg:col-span-1">
              <SelectValue placeholder="İşlem türü" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="membership-changed">Üyelik değiştirildi</SelectItem>
              <SelectItem value="account-suspended">Hesap askıya alındı</SelectItem>
              <SelectItem value="account-reactivated">Hesap yeniden aktif edildi</SelectItem>
            </SelectContent>
          </Select>

          <Select value="all" disabled>
            <SelectTrigger className="rounded-none lg:col-span-1">
              <SelectValue placeholder="Sonuç" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="success">Başarılı</SelectItem>
              <SelectItem value="failed">Başarısız</SelectItem>
            </SelectContent>
          </Select>

          <Input disabled className="rounded-none lg:col-span-1" placeholder="Hedef email ara" />
          <Input disabled className="rounded-none lg:col-span-1" placeholder="Aktör email ara" />
          <Input disabled className="rounded-none lg:col-span-1" placeholder="Başlangıç" />
          <Input disabled className="rounded-none lg:col-span-1" placeholder="Bitiş" />
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          Filtreler V1-B7d entegrasyonunda aktifleşecek.
        </p>

        <div className="border border-border/70">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarih</TableHead>
                <TableHead>İşlem</TableHead>
                <TableHead>Hedef</TableHead>
                <TableHead>Aktör</TableHead>
                <TableHead>Neden</TableHead>
                <TableHead>Sonuç</TableHead>
                <TableHead>Değişim özeti</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center text-sm text-muted-foreground">
                  Henüz audit log verisi bu arayüze bağlanmadı.
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <Alert className="rounded-none border-border/70">
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm font-medium">Read-only shell</AlertTitle>
          <AlertDescription>
            <p>RPC entegrasyonu V1-B7d aşamasında eklenecek.</p>
            <p>Backend RPC hazır; frontend veri entegrasyonu V1-B7d aşamasında yapılacak.</p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
