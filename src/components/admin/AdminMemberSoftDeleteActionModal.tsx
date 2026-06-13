import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminAccountStatus } from "@/hooks/useAdminMembers";
import type { AdminMemberDetail } from "@/hooks/useAdminMemberDetail";
import type { ReactNode } from "react";

export type AdminSoftDeleteActionMode = "archive" | "restore";

export type AdminSoftDeleteReasonCode =
  | "test_account"
  | "duplicate_account"
  | "admin_cleanup"
  | "user_request"
  | "policy_violation"
  | "admin_correction"
  | "accidental_delete";

export type AdminSoftDeleteTarget = Pick<
  AdminMemberDetail,
  "user_id" | "email" | "full_name" | "account_status" | "membership" | "updated_at"
>;

type AdminMemberSoftDeleteActionModalProps = {
  member: AdminSoftDeleteTarget | null;
  open: boolean;
  mode: AdminSoftDeleteActionMode | null;
  reasonCode: string;
  confirmText: string;
  onReasonCodeChange: (reasonCode: string) => void;
  onConfirmTextChange: (value: string) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  errorMessage: string | null;
};

const archiveReasonCodeOptions: { value: AdminSoftDeleteReasonCode; label: string }[] = [
  { value: "test_account", label: "Test hesabı" },
  { value: "duplicate_account", label: "Tekrarlı hesap" },
  { value: "admin_cleanup", label: "Yönetici temizliği" },
  { value: "user_request", label: "Kullanıcı talebi" },
  { value: "policy_violation", label: "Politika ihlali" },
];

const restoreReasonCodeOptions: { value: AdminSoftDeleteReasonCode; label: string }[] = [
  { value: "admin_correction", label: "Yönetici düzeltmesi" },
  { value: "user_request", label: "Kullanıcı talebi" },
  { value: "accidental_delete", label: "Yanlışlıkla silindi" },
  { value: "admin_cleanup", label: "Yönetici temizliği" },
];

const accountStatusLabels: Record<AdminAccountStatus, string> = {
  active: "Aktif",
  suspended: "Askıya alındı",
  security_blocked: "Güvenlik nedeniyle engellendi",
  deleted: "Silinen",
  anonymized: "Anonimleştirildi",
};

const getReasonCodeOptions = (mode: AdminSoftDeleteActionMode | null) => {
  if (mode === "archive") return archiveReasonCodeOptions;
  if (mode === "restore") return restoreReasonCodeOptions;
  return [];
};

const getConfirmLabel = (mode: AdminSoftDeleteActionMode | null) => {
  if (mode === "archive") return "SİLİNENLERE TAŞI";
  if (mode === "restore") return "GERİ AL";
  return "";
};

const getTitle = (mode: AdminSoftDeleteActionMode | null) => {
  if (mode === "archive") return "Üyeyi silinenlere taşı";
  if (mode === "restore") return "Üyeyi geri al";
  return "İşlem";
};

const getDescription = (mode: AdminSoftDeleteActionMode | null) => {
  if (mode === "archive") {
    return "Bu işlem kullanıcıyı kalıcı olarak silmez. Üye normal listeden gizlenir ve Silinen üyeler bölümünden geri alınabilir.";
  }

  if (mode === "restore") {
    return "Bu işlem üyeyi yeniden aktif hale getirir ve normal üye listesine taşır.";
  }

  return "";
};

export const AdminMemberSoftDeleteActionModal = ({
  member,
  open,
  mode,
  reasonCode,
  confirmText,
  onReasonCodeChange,
  onConfirmTextChange,
  onOpenChange,
  onConfirm,
  loading,
  errorMessage,
}: AdminMemberSoftDeleteActionModalProps) => {
  const confirmLabel = getConfirmLabel(mode);
  const expectedConfirmText = confirmLabel.toUpperCase();
  const selectedReasonCode = reasonCode.trim();
  const canConfirm =
    member !== null &&
    mode !== null &&
    confirmText.trim().toUpperCase() === expectedConfirmText &&
    selectedReasonCode !== "" &&
    !loading;
  const reasonCodeOptions = getReasonCodeOptions(mode);

  const handleOpenChange = (nextOpen: boolean) => {
    if (loading && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-medium tracking-wide">{getTitle(mode)}</DialogTitle>
          <DialogDescription>{getDescription(mode)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <ModalField label="E-posta" value={member?.email ?? "-"} />
            <ModalField label="Ad soyad" value={member?.full_name ?? "-"} />
            <ModalField label="Mevcut durum" value={member?.account_status ? accountStatusLabels[member.account_status] : "-"} />
            <ModalField label="Plan" value={member?.membership ?? "-"} />
          </dl>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">İşlem nedeni</label>
            <Select
              value={reasonCode}
              onValueChange={onReasonCodeChange}
              disabled={loading}
            >
              <SelectTrigger className="rounded-none" disabled={loading}>
                <SelectValue placeholder="İşlem nedeni seçin" />
              </SelectTrigger>
              <SelectContent>
                {reasonCodeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Onay metni</label>
            <Input
              value={confirmText}
              onChange={(event) => onConfirmTextChange(event.target.value)}
              placeholder={confirmLabel}
              className="rounded-none uppercase tracking-wide"
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">İşlemi doğrulamak için {confirmLabel} yazın.</p>
          </div>

          <Alert className="rounded-none">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Denetim kaydı</AlertTitle>
            <AlertDescription>Bu işlem denetim kaydına işlenir.</AlertDescription>
          </Alert>

          {errorMessage && (
            <Alert variant="destructive" className="rounded-none">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>İşlem tamamlanamadı</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            İptal
          </Button>
          <Button
            type="button"
            disabled={!canConfirm}
            onClick={onConfirm}
            variant={mode === "archive" ? "destructive" : "default"}
          >
            {loading ? "İşleniyor..." : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ModalField = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="border border-border/70 p-3">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-2 break-words text-sm text-foreground">{value}</dd>
  </div>
);
