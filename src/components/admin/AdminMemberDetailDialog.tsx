import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AdminMemberDetail, useAdminMemberDetail } from "@/hooks/useAdminMemberDetail";
import type { AdminAccountStatusTarget } from "./AdminAccountStatusActionModal";
import type { AdminMembershipTarget } from "./AdminMemberActionModal";
import { AdminMemberDetailPanel } from "./AdminMemberDetailPanel";

type AdminMemberDetailState = ReturnType<typeof useAdminMemberDetail>;

type AdminMemberDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detail: AdminMemberDetailState;
  currentAdminUserId: string | null;
  isSuperManager: boolean;
  onPrepareAccountStatusChange: (member: AdminMemberDetail, targetStatus: AdminAccountStatusTarget) => void;
  onPrepareArchiveMember: (member: AdminMemberDetail) => void;
  onPrepareRestoreMember: (member: AdminMemberDetail) => void;
  onPrepareMembershipChange: (member: AdminMemberDetail, targetMembership: AdminMembershipTarget) => void;
};

export const AdminMemberDetailDialog = ({
  open,
  onOpenChange,
  detail,
  currentAdminUserId,
  isSuperManager,
  onPrepareAccountStatusChange,
  onPrepareArchiveMember,
  onPrepareRestoreMember,
  onPrepareMembershipChange,
}: AdminMemberDetailDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0">
        <div className="max-h-[85vh] overflow-y-auto p-6">
          <DialogHeader className="mb-4 text-left">
            <DialogTitle className="text-xl font-medium tracking-wide">Üye Detayı</DialogTitle>
            <DialogDescription>Operasyonel hesap ve üyelik bilgileri</DialogDescription>
          </DialogHeader>
          <AdminMemberDetailPanel
            detail={detail}
            currentAdminUserId={currentAdminUserId}
            isSuperManager={isSuperManager}
            onClose={() => onOpenChange(false)}
            onPrepareAccountStatusChange={onPrepareAccountStatusChange}
            onPrepareArchiveMember={onPrepareArchiveMember}
            onPrepareRestoreMember={onPrepareRestoreMember}
            onPrepareMembershipChange={onPrepareMembershipChange}
            showHeader={false}
            showCloseButton={false}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
