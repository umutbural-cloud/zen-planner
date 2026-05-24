import { useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import {
  type AdminAuditAction,
  type AdminAuditLogFilters,
  type AdminAuditLogItem,
  useAdminAuditLogs,
} from "@/hooks/useAdminAuditLogs";

type AdminAuditLogPanelProps = {
  enabled: boolean;
  isSuperManager: boolean;
};

type DraftFilters = {
  actionFilter: AdminAuditAction | null;
  successFilter: boolean | null;
  targetQuery: string;
  actorQuery: string;
  createdFrom: string;
  createdTo: string;
};

const AUDIT_LIMIT = 50;

const defaultDraftFilters: DraftFilters = {
  actionFilter: null,
  successFilter: null,
  targetQuery: "",
  actorQuery: "",
  createdFrom: "",
  createdTo: "",
};

const defaultAppliedFilters: AdminAuditLogFilters = {
  actionFilter: null,
  successFilter: null,
  targetQuery: "",
  actorQuery: "",
  createdFrom: null,
  createdTo: null,
  limit: AUDIT_LIMIT,
  offset: 0,
};

const actionLabels: Record<AdminAuditAction, string> = {
  "membership.changed": "Üyelik değiştirildi",
  "account.suspended": "Hesap askıya alındı",
  "account.reactivated": "Hesap yeniden aktif edildi",
};

const reasonLabels: Record<string, string> = {
  plan_upgrade: "Plan yükseltme",
  plan_downgrade: "Plan düşürme",
  admin_correction: "Admin düzeltmesi",
  policy_violation: "Politika ihlali",
  payment_issue: "Ödeme sorunu",
  user_request: "Kullanıcı talebi",
  reactivation_approved: "Yeniden aktivasyon onayı",
};

const actionSelectValue = (value: AdminAuditAction | null) => value ?? "all";
const successSelectValue = (value: boolean | null) => value === null ? "all" : value ? "success" : "failed";

const fromActionSelectValue = (value: string): AdminAuditAction | null => {
  if (value === "membership.changed" || value === "account.suspended" || value === "account.reactivated") {
    return value;
  }

  return null;
};

const fromSuccessSelectValue = (value: string): boolean | null => {
  if (value === "success") return true;
  if (value === "failed") return false;
  return null;
};

const toIsoOrNull = (value: string) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
};

const formatDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatReason = (value: string | null) => {
  if (!value) return "—";
  return reasonLabels[value] ?? "Diğer";
};

const formatChangeSummary = (item: AdminAuditLogItem) => {
  if (!item.old_value_summary || !item.new_value_summary) return "—";
  return `${item.old_value_summary} → ${item.new_value_summary}`;
};

export const AdminAuditLogPanel = ({ enabled, isSuperManager }: AdminAuditLogPanelProps) => {
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(defaultDraftFilters);
  const [appliedFilters, setAppliedFilters] = useState<AdminAuditLogFilters>(defaultAppliedFilters);
  const auditLogs = useAdminAuditLogs({
    enabled: enabled && isSuperManager,
    filters: appliedFilters,
  });

  const canGoPrevious = appliedFilters.offset > 0 && !auditLogs.loading;
  const canGoNext = auditLogs.offset + auditLogs.limit < auditLogs.totalCount && !auditLogs.loading;
  const visibleRange = useMemo(() => {
    if (auditLogs.totalCount === 0) return "0-0";
    const start = auditLogs.offset + 1;
    const end = Math.min(auditLogs.offset + auditLogs.limit, auditLogs.totalCount);
    return `${start}-${end}`;
  }, [auditLogs.limit, auditLogs.offset, auditLogs.totalCount]);

  if (!isSuperManager) {
    return null;
  }

  const applyFilters = () => {
    setAppliedFilters({
      actionFilter: draftFilters.actionFilter,
      successFilter: draftFilters.successFilter,
      targetQuery: draftFilters.targetQuery,
      actorQuery: draftFilters.actorQuery,
      createdFrom: toIsoOrNull(draftFilters.createdFrom),
      createdTo: toIsoOrNull(draftFilters.createdTo),
      limit: AUDIT_LIMIT,
      offset: 0,
    });
  };

  const clearFilters = () => {
    setDraftFilters(defaultDraftFilters);
    setAppliedFilters(defaultAppliedFilters);
  };

  const previousPage = () => {
    setAppliedFilters((current) => ({
      ...current,
      offset: Math.max(0, current.offset - current.limit),
    }));
  };

  const nextPage = () => {
    setAppliedFilters((current) => ({
      ...current,
      offset: current.offset + current.limit,
    }));
  };

  return (
    <Card className="rounded-none border-border/70 shadow-none">
      <CardHeader className="gap-5 p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-base font-medium tracking-wide">Audit Log</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              Admin işlemleri burada read-only olarak görüntülenir.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={auditLogs.refresh} disabled={!enabled || auditLogs.loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Yenile
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-6">
          <Select
            value={actionSelectValue(draftFilters.actionFilter)}
            onValueChange={(value) => setDraftFilters((current) => ({ ...current, actionFilter: fromActionSelectValue(value) }))}
          >
            <SelectTrigger className="rounded-none lg:col-span-1">
              <SelectValue placeholder="İşlem türü" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="membership.changed">Üyelik değiştirildi</SelectItem>
              <SelectItem value="account.suspended">Hesap askıya alındı</SelectItem>
              <SelectItem value="account.reactivated">Hesap yeniden aktif edildi</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={successSelectValue(draftFilters.successFilter)}
            onValueChange={(value) => setDraftFilters((current) => ({ ...current, successFilter: fromSuccessSelectValue(value) }))}
          >
            <SelectTrigger className="rounded-none lg:col-span-1">
              <SelectValue placeholder="Sonuç" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="success">Başarılı</SelectItem>
              <SelectItem value="failed">Başarısız</SelectItem>
            </SelectContent>
          </Select>

          <Input
            className="rounded-none lg:col-span-1"
            placeholder="Hedef email ara"
            value={draftFilters.targetQuery}
            onChange={(event) => setDraftFilters((current) => ({ ...current, targetQuery: event.target.value }))}
          />
          <Input
            className="rounded-none lg:col-span-1"
            placeholder="Aktör email ara"
            value={draftFilters.actorQuery}
            onChange={(event) => setDraftFilters((current) => ({ ...current, actorQuery: event.target.value }))}
          />
          <Input
            className="rounded-none lg:col-span-1"
            type="datetime-local"
            placeholder="Başlangıç"
            value={draftFilters.createdFrom}
            onChange={(event) => setDraftFilters((current) => ({ ...current, createdFrom: event.target.value }))}
          />
          <Input
            className="rounded-none lg:col-span-1"
            type="datetime-local"
            placeholder="Bitiş"
            value={draftFilters.createdTo}
            onChange={(event) => setDraftFilters((current) => ({ ...current, createdTo: event.target.value }))}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button type="button" size="sm" onClick={applyFilters} disabled={!enabled || auditLogs.loading}>
            Filtreleri uygula
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={clearFilters} disabled={!enabled || auditLogs.loading}>
            Temizle
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-5 px-5 pb-5 pt-0">
        <Alert className="rounded-none border-border/70">
          <AlertTitle className="text-sm font-medium">Denetim kayıtları</AlertTitle>
          <AlertDescription>Bu alan yalnızca denetim amaçlıdır; kayıtlar değiştirilemez.</AlertDescription>
        </Alert>

        {auditLogs.errorMessage && (
          <Alert variant="destructive" className="rounded-none">
            <AlertTitle>Audit log kayıtları alınamadı.</AlertTitle>
            <AlertDescription>
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={auditLogs.refresh}>
                Tekrar dene
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {auditLogs.loading && (
          <div className="border border-border/70 p-6 text-sm text-muted-foreground">
            Audit log kayıtları yükleniyor...
          </div>
        )}

        {!auditLogs.loading && !auditLogs.errorMessage && auditLogs.items.length === 0 && (
          <div className="border border-border/70 p-6 text-sm text-muted-foreground">
            Bu filtrelerle eşleşen audit log kaydı bulunamadı.
          </div>
        )}

        {!auditLogs.loading && !auditLogs.errorMessage && auditLogs.items.length > 0 && (
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
                {auditLogs.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                    <TableCell>{actionLabels[item.action]}</TableCell>
                    <TableCell>{item.target_email ?? "—"}</TableCell>
                    <TableCell>{item.actor_email ?? "—"}</TableCell>
                    <TableCell>{formatReason(item.reason_code)}</TableCell>
                    <TableCell>{item.success ? "Başarılı" : "Başarısız"}</TableCell>
                    <TableCell>{formatChangeSummary(item)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border/70 pt-4 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>
            {visibleRange} / {auditLogs.totalCount} · Toplam {auditLogs.totalCount} kayıt
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={previousPage} disabled={!canGoPrevious}>
              Önceki
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={nextPage} disabled={!canGoNext}>
              Sonraki
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
