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

export type AdminMembershipTarget = "beginner" | "plus";

export type AdminMembershipReasonCode =
  | "admin_correction"
  | "support_request"
  | "payment_confirmed"
  | "plan_upgrade"
  | "plan_downgrade";

type AdminMemberActionModalProps = {
  member: AdminMemberDetail | null;
  open: boolean;
  targetMembership: AdminMembershipTarget | null;
  reasonCode: AdminMembershipReasonCode | null;
  onReasonCodeChange: (reasonCode: AdminMembershipReasonCode) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  loading: boolean;
  errorMessage: string | null;
};

const reasonCodeOptions: { value: AdminMembershipReasonCode; label: string }[] = [
  { value: "admin_correction", label: "admin_correction" },
  { value: "support_request", label: "support_request" },
  { value: "payment_confirmed", label: "payment_confirmed" },
  { value: "plan_upgrade", label: "plan_upgrade" },
  { value: "plan_downgrade", label: "plan_downgrade" },
];

export const AdminMemberActionModal = ({
  member,
  open,
  targetMembership,
  reasonCode,
  onReasonCodeChange,
  onOpenChange,
  onConfirm,
  loading,
  errorMessage,
}: AdminMemberActionModalProps) => {
  const currentMembership = member?.membership ?? null;
  const isDowngrade = currentMembership === "plus" && targetMembership === "beginner";
  const hasReasonCode = reasonCode !== null;
  const canConfirm =
    member !== null &&
    targetMembership !== null &&
    hasReasonCode &&
    currentMembership !== targetMembership &&
    !loading;

  const handleOpenChange = (nextOpen: boolean) => {
    if (loading && !nextOpen) return;
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="rounded-none sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-medium tracking-wide">Üyelik değişikliği onayı</DialogTitle>
          <DialogDescription>Bu işlem audit log'a yazılır.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isDowngrade && (
            <Alert variant="destructive" className="rounded-none">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Plan düşürme işlemi</AlertTitle>
              <AlertDescription>Plus üyelik beginner plana düşürülecek.</AlertDescription>
            </Alert>
          )}

          <dl className="grid gap-3 sm:grid-cols-2">
            <ModalField label="E-posta" value={member?.email ?? "-"} />
            <ModalField label="Ad" value={member?.full_name ?? "-"} />
            <ModalField label="Eski plan" value={currentMembership ?? "-"} />
            <ModalField label="Yeni plan" value={targetMembership ?? "-"} />
          </dl>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wide text-muted-foreground">Reason code</label>
            <Select
              value={reasonCode ?? undefined}
              onValueChange={(value) => onReasonCodeChange(value as AdminMembershipReasonCode)}
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
          <Button type="button" disabled={!canConfirm} onClick={onConfirm} variant={isDowngrade ? "destructive" : "default"}>
            Onayla
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
