import { Lock, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type FeatureAccessRow = {
  feature: string;
  category: string;
  beginner: "Açık" | "Kapalı";
  plus: "Açık" | "Kapalı";
  backendEnforcement: string;
  risk: "Düşük" | "Orta" | "Yüksek";
  note: string;
};

const featureRows: FeatureAccessRow[] = [
  {
    feature: "Ana Sayfa / Dashboard",
    category: "dashboard",
    beginner: "Kapalı",
    plus: "Açık",
    backendEnforcement: "Gerekli",
    risk: "Orta",
    note: "Beginner için kapalı; Plus için ana dashboard.",
  },
  {
    feature: "Pomodoro",
    category: "focus",
    beginner: "Açık",
    plus: "Açık",
    backendEnforcement: "Düşük / sonraki aşama",
    risk: "Düşük",
    note: "Beginner’ın ana çalışma alanı.",
  },
  {
    feature: "Temel Görevler",
    category: "tasks",
    beginner: "Açık",
    plus: "Açık",
    backendEnforcement: "Sonraki aşama",
    risk: "Orta",
    note: "Core görev yönetimi.",
  },
  {
    feature: "Projeler",
    category: "planning",
    beginner: "Açık",
    plus: "Açık",
    backendEnforcement: "Sonraki aşama",
    risk: "Yüksek",
    note: "Beginner’a da açık.",
  },
  {
    feature: "Alışkanlıklar",
    category: "habits",
    beginner: "Açık",
    plus: "Açık",
    backendEnforcement: "Sonraki aşama",
    risk: "Orta",
    note: "Takip açık.",
  },
  {
    feature: "Alışkanlık İstatistikleri",
    category: "habits",
    beginner: "Kapalı",
    plus: "Açık",
    backendEnforcement: "Gerekli",
    risk: "Orta",
    note: "Analiz/istatistik Plus.",
  },
  {
    feature: "Pomodoro İçi Sınırlı Çalışma Geçmişi",
    category: "work_history",
    beginner: "Açık",
    plus: "Açık",
    backendEnforcement: "Düşük / sonraki aşama",
    risk: "Düşük",
    note: "Beginner Pomodoro içinde sınırlı geçmiş görebilir.",
  },
  {
    feature: "Tam Çalışma Geçmişi",
    category: "work_history",
    beginner: "Kapalı",
    plus: "Açık",
    backendEnforcement: "Gerekli",
    risk: "Orta",
    note: "Ayrı detaylı çalışma geçmişi Plus.",
  },
  {
    feature: "Gelişmiş İstatistikler",
    category: "stats",
    beginner: "Kapalı",
    plus: "Açık",
    backendEnforcement: "Gerekli",
    risk: "Orta",
    note: "Detaylı raporlar Plus.",
  },
  {
    feature: "Bilgi Merkezi",
    category: "knowledge",
    beginner: "Kapalı",
    plus: "Açık",
    backendEnforcement: "Gerekli",
    risk: "Yüksek",
    note: "İçerik/knowledge alanı Plus.",
  },
  {
    feature: "Anlık Notlar",
    category: "knowledge",
    beginner: "Kapalı",
    plus: "Açık",
    backendEnforcement: "Gerekli",
    risk: "Yüksek",
    note: "Plus-only not alanı.",
  },
  {
    feature: "Metin Belgeleri",
    category: "knowledge",
    beginner: "Kapalı",
    plus: "Açık",
    backendEnforcement: "Gerekli",
    risk: "Yüksek",
    note: "Plus-only belge alanı.",
  },
];

export const AdminFeatureAccessMatrixPanel = ({ isSuperManager }: { isSuperManager: boolean }) => {
  if (!isSuperManager) {
    return null;
  }

  return (
    <Card className="rounded-none border-border/70 shadow-none">
      <CardHeader className="gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="text-base font-medium tracking-wide">Erişim Matrisi</CardTitle>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              Beginner ve Plus üyeliklerin hangi özelliklere erişebileceğini gösteren read-only plan ekranı. RPC
              entegrasyonu V1-C3b aşamasında eklenecektir.
            </p>
          </div>
          <Badge variant="outline" className="rounded-none font-normal">
            Read-only
          </Badge>
        </div>

        <Alert className="rounded-none border-border/70 bg-muted/20">
          <Lock className="h-4 w-4" />
          <AlertTitle className="text-sm font-medium">V1-C4 öncesi salt görünüm</AlertTitle>
          <AlertDescription className="text-sm leading-6 text-muted-foreground">
            Bu ekranda değişiklik yapılamaz. V1-C3a yalnızca plan görünümünü sunar; V1-C4 ile mutasyon ve audit akışı
            devreye alınacaktır.
          </AlertDescription>
        </Alert>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5 pt-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Aşağıdaki liste ürün planı ile uyumlu başlangıç matrisi özetidir.
          </p>
          <Button type="button" variant="outline" size="sm" disabled>
            <RefreshCw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
        </div>

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
                <TableHead>Not</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featureRows.map((row) => (
                <TableRow key={row.feature}>
                  <TableCell className="font-medium">{row.feature}</TableCell>
                  <TableCell className="text-muted-foreground">{row.category}</TableCell>
                  <TableCell>{row.beginner}</TableCell>
                  <TableCell>{row.plus}</TableCell>
                  <TableCell>{row.backendEnforcement}</TableCell>
                  <TableCell>{row.risk}</TableCell>
                  <TableCell className="max-w-[24rem] whitespace-normal leading-6 text-muted-foreground">
                    {row.note}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

