import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminMemberDetail, useAdminMemberDetail } from "@/hooks/useAdminMemberDetail";
import type { AdminMembershipTarget } from "./AdminMemberActionModal";

type AdminMemberDetailState = ReturnType<typeof useAdminMemberDetail>;

type AdminMemberDetailPanelProps = {
  detail: AdminMemberDetailState;
  onClose: () => void;
  onPrepareMembershipChange: (member: AdminMemberDetail, targetMembership: AdminMembershipTarget) => void;
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

const statusBadge = (value: string | null) => {
  if (!value) return <Badge variant="outline">-</Badge>;

  return (
    <Badge variant="outline" className="rounded-none font-normal">
      {value}
    </Badge>
  );
};

export const AdminMemberDetailPanel = ({ detail, onClose, onPrepareMembershipChange }: AdminMemberDetailPanelProps) => {
  return (
    <Card className="rounded-none border-border/70 shadow-none">
      <CardHeader className="flex flex-row items-start justify-between gap-4 p-5">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium tracking-wide">Üye detayı</CardTitle>
          <p className="text-sm text-muted-foreground">Sadece operasyonel hesap bilgileri</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Kapat">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 px-5 pb-5 pt-0">
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
            <MembershipActions member={detail.member} onPrepareMembershipChange={onPrepareMembershipChange} />
          </>
        )}
      </CardContent>
    </Card>
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
    <DetailItem label="Ad" value={member.full_name ?? "-"} />
    <DetailItem label="Plan" value={statusBadge(member.membership)} />
    <DetailItem label="Plan durumu" value={statusBadge(member.membership_status)} />
    <DetailItem label="Hesap durumu" value={statusBadge(member.account_status)} />
    <DetailItem label="Son görülme" value={formatDate(member.last_seen_at)} />
    <DetailItem label="Oluşturulma" value={formatDate(member.created_at)} />
    <DetailItem label="Güncellenme" value={formatDate(member.updated_at)} />
    <DetailItem label="Kullanabilir" value={booleanLabel(member.can_use_app)} />
    <DetailItem label="Dışa aktarabilir" value={booleanLabel(member.can_export)} />
    <DetailItem label="Engel nedeni" value={member.block_reason ?? "-"} />
  </dl>
);

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="border border-border/70 p-4">
    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
    <dd className="mt-2 break-words text-sm text-foreground">{value}</dd>
  </div>
);
