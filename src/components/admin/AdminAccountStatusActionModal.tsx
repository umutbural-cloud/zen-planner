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

export const AdminAccountStatusActionModal = ({
  member,
  open,
  targetStatus,
  reasonCode,
  onReasonCodeChange,
  onOpenChange,
}: AdminAccountStatusActionModalProps) => {
  const currentStatus = member?.account_status ?? null;
  const reasonCodeOptions = getReasonCodeOptions(targetStatus);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
            >
              <SelectTrigger className="rounded-none">
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

          <Alert className="rounded-none">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>V1-B6c-1 UI shell</AlertTitle>
            <AlertDescription>RPC entegrasyonu V1-B6c-2 aşamasında eklenecek.</AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            İptal
          </Button>
          <Button type="button" disabled>
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
