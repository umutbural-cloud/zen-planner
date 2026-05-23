import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AdminMemberDetail } from "@/hooks/useAdminMemberDetail";

export type AdminAccountStatusTarget = "active" | "suspended";

export type AdminAccountStatusReasonCode =
  | "policy_violation"
  | "payment_issue"
  | "user_request"
  | "admin_correction"
  | "reactivation_approved";

type AdminAccountStatusActionModalProps = {
  member: AdminMemberDetail | null;
  open: boolean;
  targetStatus: AdminAccountStatusTarget | null;
  reasonCode: AdminAccountStatusReasonCode | null;
  onReasonCodeChange: (reasonCode: AdminAccountStatusReasonCode) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  errorMessage: string | null;
};

const suspendReasonCodeOptions: { value: AdminAccountStatusReasonCode; label: string }[] = [
  { value: "policy_violation", label: "policy_violation" },
  { value: "payment_issue", label: "payment_issue" },
  { value: "user_request", label: "user_request" },
  { value: "admin_correction", label: "admin_correction" },
];

const reactivateReasonCodeOptions: { value: AdminAccountStatusReasonCode; label: string }[] = [
  { value: "reactivation_approved", label: "reactivation_approved" },
  { value: "admin_correction", label: "admin_correction" },
];

const getReasonCodeOptions = (targetStatus: AdminAccountStatusTarget | null) => {
  if (targetStatus === "suspended") return suspendReasonCodeOptions;
  if (targetStatus === "active") return reactivateReasonCodeOptions;
  return [];
};

export const isValidAccountStatusReason = (
  currentStatus: string | null,
  targetStatus: AdminAccountStatusTarget | null,
  reasonCode: AdminAccountStatusReasonCode | null,
) => {
  if (currentStatus === "active" && targetStatus === "suspended") {
    return suspendReasonCodeOptions.some((option) => option.value === reasonCode);
  }

  if (currentStatus === "suspended" && targetStatus === "active") {
    return reactivateReasonCodeOptions.some((option) => option.value === reasonCode);
  }

  return false;
};

export const AdminAccountStatusActionModal = ({
  member,
  open,
  targetStatus,
  reasonCode,
  onReasonCodeChange,
  onOpenChange,
  onConfirm,
  loading,
  errorMessage,
}: AdminAccountStatusActionModalProps) => {
  const currentStatus = member?.account_status ?? null;
  const reasonCodeOptions = getReasonCodeOptions(targetStatus);
  const canConfirm =
    member !== null &&
    member.admin_manageable === true &&
    currentStatus !== targetStatus &&
    (currentStatus === "active" || currentStatus === "suspended") &&
    (targetStatus === "active" || targetStatus === "suspended") &&
    isValidAccountStatusReason(currentStatus, targetStatus, reasonCode) &&
    !loading;

  const handleOpenChange = (nextOpen: boolean) => {
    if (loading && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-medium tracking-wide">Hesap durumu değişikliği</DialogTitle>
          <DialogDescription>Bu işlem audit log'a yazılır.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <ModalField label="E-posta" value={member?.email ?? "-"} />
            <ModalField label="Ad" value={member?.full_name ?? "-"} />
            <ModalField label="Mevcut hesap durumu" value={currentStatus ?? "-"} />
            <ModalField label="Hedef hesap durumu" value={targetStatus ?? "-"} />
          </dl>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Reason code</label>
            <Select
              value={reasonCode ?? undefined}
              onValueChange={(value) => onReasonCodeChange(value as AdminAccountStatusReasonCode)}
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

          <Alert className="rounded-none">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Audit log</AlertTitle>
            <AlertDescription>Bu işlem audit log'a yazılır.</AlertDescription>
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
          <Button type="button" disabled={!canConfirm} onClick={onConfirm} variant={targetStatus === "suspended" ? "destructive" : "default"}>
            {loading ? "İşleniyor..." : "Onayla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ModalField = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="border border-border/70 p-3">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-2 break-words text-sm text-foreground">{value}</dd>
  </div>
);
