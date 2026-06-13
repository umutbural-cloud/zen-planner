import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminMemberDetail, useAdminMemberDetail } from "@/hooks/useAdminMemberDetail";
import type { AdminAccountStatusTarget } from "./AdminAccountStatusActionModal";
import type { AdminMembershipTarget } from "./AdminMemberActionModal";

type AdminMemberDetailState = ReturnType<typeof useAdminMemberDetail>;

type AdminMemberDetailPanelProps = {
  detail: AdminMemberDetailState;
  currentAdminUserId: string | null;
  onClose: () => void;
  onPrepareAccountStatusChange: (member: AdminMemberDetail, targetStatus: AdminAccountStatusTarget) => void;
  onPrepareMembershipChange: (member: AdminMemberDetail, targetMembership: AdminMembershipTarget) => void;
  showHeader?: boolean;
  showCloseButton?: boolean;
};

const formatDate = (value: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const booleanLabel = (value: boolean) => (value ? "Evet" : "Hayır");

const accountStatusLabels: Record<string, string> = {
  active: "Aktif",
  suspended: "Askıya alındı",
  security_blocked: "Güvenlik nedeniyle engellendi",
  deleted: "Silindi",
  anonymized: "Anonimleştirildi",
};

const membershipLabels: Record<string, string> = {
  beginner: "Başlangıç",
  plus: "Plus",
};

const membershipStatusLabels: Record<string, string> = {
  active: "Aktif",
  cancelled: "İptal edildi",
  expired: "Süresi doldu",
};

const reasonLabels: Record<string, string> = {
  membership_inactive: "Üyelik aktif değil",
  not_allowed: "İzin verilmiyor",
  self_account: "Kendi hesabı",
  admin_account: "Admin hesabı",
};

const displayValue = (value: string | null | undefined, labels?: Record<string, string>) => {
  if (!value) return "-";
  return labels?.[value] ?? value;
};

export const AdminMemberDetailPanel = ({
  detail,
  currentAdminUserId,
  onClose,
  onPrepareAccountStatusChange,
  onPrepareMembershipChange,
  showHeader = true,
  showCloseButton = true,
}: AdminMemberDetailPanelProps) => {
  return (
    <Card className="rounded-none border-border/70 shadow-none">
      {showHeader && (
        <CardHeader className="flex flex-row items-start justify-between gap-4 p-5">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium tracking-wide">Üye detayı</CardTitle>
            <p className="text-sm text-muted-foreground">Sadece operasyonel hesap bilgileri</p>
          </div>
          {showCloseButton && (
            <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Kapat">
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardHeader>
      )}

      <CardContent className={showHeader ? "space-y-4 px-5 pb-5 pt-0" : "space-y-4 p-5"}>
        {!detail.loading && !detail.error && !detail.member && (
          <div className="border border-border/70 p-6 text-sm text-muted-foreground">Üye seçilmedi.</div>
        )}

        {detail.loading && (
          <div className="border border-border/70 p-6 text-sm text-muted-foreground">Üye detayı yükleniyor...</div>
        )}

        {detail.error && (
          <div className="space-y-4 border border-destructive/30 bg-destructive/5 p-4">
            <div>
              <p className="text-sm font-medium text-destructive">Üye detayı alınamadı.</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{detail.error.message}</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={detail.refresh}>
              Tekrar dene
            </Button>
          </div>
        )}

        {!detail.loading && !detail.error && detail.member && (
          <>
            <DetailFields member={detail.member} />
            <AccountStatusActions
              member={detail.member}
              currentAdminUserId={currentAdminUserId}
              onPrepareAccountStatusChange={onPrepareAccountStatusChange}
            />
            <MembershipActions member={detail.member} onPrepareMembershipChange={onPrepareMembershipChange} />
          </>
        )}
      </CardContent>
    </Card>
  );
};

const AccountStatusActions = ({
  member,
  currentAdminUserId,
  onPrepareAccountStatusChange,
}: {
  member: AdminMemberDetail;
  currentAdminUserId: string | null;
  onPrepareAccountStatusChange: (member: AdminMemberDetail, targetStatus: AdminAccountStatusTarget) => void;
}) => {
  const currentStatus = member.account_status;
  const isSelfTarget = currentAdminUserId !== null && member.user_id === currentAdminUserId;
  const isManageabilityUnknown =
    member.admin_manageable !== true && member.admin_management_block_reason === null;

  if (isSelfTarget) {
    return (
      <div className="border border-border/70 p-4 text-sm text-muted-foreground">
        Kendi admin hesabınız için hesap durumu işlemi yapılamaz.
      </div>
    );
  }

  if (isManageabilityUnknown) {
    return (
      <div className="border border-border/70 p-4 text-sm text-muted-foreground">
        Bu hesap için yönetilebilirlik doğrulanamadı.
      </div>
    );
  }

  if (!member.admin_manageable) {
    const message =
      member.admin_management_block_reason === "self_account"
        ? "Kendi admin hesabınız için hesap durumu işlemi yapılamaz."
        : member.admin_management_block_reason === "admin_account"
          ? "Admin hesapları bu akıştan yönetilemez."
          : "Bu hesap için hesap durumu işlemi hazırlanamaz.";

    return <div className="border border-border/70 p-4 text-sm text-muted-foreground">{message}</div>;
  }

  if (currentStatus === "security_blocked") {
    return (
      <div className="border border-border/70 p-4 text-sm text-muted-foreground">
        Güvenlik nedeniyle engellendi durumu V1-B6c-3 aşamasında ayrı ele alınacak.
      </div>
    );
  }

  if (currentStatus === "deleted" || currentStatus === "anonymized") {
    return (
      <div className="border border-border/70 p-4 text-sm text-muted-foreground">
        Bu hesap durumu V1 kapsamı dışında.
      </div>
    );
  }

  if (currentStatus !== "active" && currentStatus !== "suspended") {
    return (
      <div className="border border-border/70 p-4 text-sm text-muted-foreground">
        Bu hesap durumu için hesap durumu değişikliği hazırlanamaz.
      </div>
    );
  }

  const targetStatus: AdminAccountStatusTarget = currentStatus === "active" ? "suspended" : "active";
  const buttonLabel = currentStatus === "active" ? "Hesabı askıya al" : "Hesabı yeniden aktif et";
  const buttonVariant = currentStatus === "active" ? "destructive" : "outline";

  return (
    <div className="border border-border/70 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">Hesap durumu işlemi</h3>
        <p className="text-xs leading-5 text-muted-foreground">
          Bu aşamada yalnızca hesap durumu onay ekranı hazırlanır.
        </p>
      </div>
      <Button
        type="button"
        variant={buttonVariant}
        size="sm"
        className="mt-4"
        onClick={() => onPrepareAccountStatusChange(member, targetStatus)}
      >
        {buttonLabel}
      </Button>
    </div>
  );
};

const MembershipActions = ({
  member,
  onPrepareMembershipChange,
}: {
  member: AdminMemberDetail;
  onPrepareMembershipChange: (member: AdminMemberDetail, targetMembership: AdminMembershipTarget) => void;
}) => {
  const currentMembership = member.membership;

  if (currentMembership !== "beginner" && currentMembership !== "plus") {
    return (
      <div className="border border-border/70 p-4 text-sm text-muted-foreground">
        Bu üyenin planı için üyelik değişikliği hazırlanamaz.
      </div>
    );
  }

  const targetMembership: AdminMembershipTarget = currentMembership === "beginner" ? "plus" : "beginner";
  const buttonLabel = currentMembership === "beginner" ? "Plus'a geçir" : "Beginner'a düşür";
  const buttonVariant = currentMembership === "plus" ? "destructive" : "outline";

  return (
    <div className="border border-border/70 p-4">
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground">Üyelik işlemi</h3>
        <p className="text-xs leading-5 text-muted-foreground">Bu aşamada yalnızca onay ekranı hazırlanır.</p>
      </div>
      <Button
        type="button"
        variant={buttonVariant}
        size="sm"
        className="mt-4"
        onClick={() => onPrepareMembershipChange(member, targetMembership)}
      >
        {buttonLabel}
      </Button>
    </div>
  );
};

const DetailFields = ({ member }: { member: AdminMemberDetail }) => (
  <dl className="grid gap-3 sm:grid-cols-2">
    <DetailItem label="E-posta" value={member.email ?? "-"} />
    <DetailItem label="Ad soyad" value={member.full_name ?? "-"} />
    <DetailItem label="Plan" value={displayValue(member.membership, membershipLabels)} />
    <DetailItem label="Plan durumu" value={displayValue(member.membership_status, membershipStatusLabels)} />
    <DetailItem label="Hesap durumu" value={displayValue(member.account_status, accountStatusLabels)} />
    <DetailItem label="Son görülme" value={formatDate(member.last_seen_at)} />
    <DetailItem label="Oluşturulma" value={formatDate(member.created_at)} />
    <DetailItem label="Güncellenme" value={formatDate(member.updated_at)} />
    <DetailItem label="Kullanabilir" value={booleanLabel(member.can_use_app)} />
    <DetailItem label="Dışa aktarabilir" value={booleanLabel(member.can_export)} />
    <DetailItem label="Engel nedeni" value={displayValue(member.block_reason, reasonLabels)} />
  </dl>
);

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="border border-border/70 p-4">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-2 break-words text-sm text-foreground">{value}</dd>
  </div>
);
