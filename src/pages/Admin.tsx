import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { useCallback, useState } from "react";
import { Activity, AlertTriangle, BarChart3, Home, Settings, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import {
  AdminAccountStatusActionModal,
  type AdminAccountStatusReasonCode,
  type AdminAccountStatusTarget,
} from "@/components/admin/AdminAccountStatusActionModal";
import { AdminAuditLogPanel } from "@/components/admin/AdminAuditLogPanel";
import { AdminFeatureAccessMatrixPanel } from "@/components/admin/AdminFeatureAccessMatrixPanel";
import { AdminMemberDetailDialog } from "@/components/admin/AdminMemberDetailDialog";
import {
  AdminMemberActionModal,
  type AdminMembershipReasonCode,
  type AdminMembershipTarget,
} from "@/components/admin/AdminMemberActionModal";
import { AdminMembersTable } from "@/components/admin/AdminMembersTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAccountStatusActions } from "@/hooks/useAdminAccountStatusActions";
import { useAdminGate } from "@/hooks/useAdminGate";
import { useAdminFeatureAccessMatrix } from "@/hooks/useAdminFeatureAccessMatrix";
import type { AdminMemberDetail } from "@/hooks/useAdminMemberDetail";
import { useAdminMemberDetail } from "@/hooks/useAdminMemberDetail";
import { useAdminMembers } from "@/hooks/useAdminMembers";
import { useAdminMemberActions } from "@/hooks/useAdminMemberActions";

const adminNavigationItems = [
  { label: "Ana Sayfa", to: "/admin", icon: Home, end: true },
  { label: "İstatistikler", to: "/admin/stats", icon: BarChart3 },
  { label: "Üyeler", to: "/admin/users", icon: Users },
  { label: "Ayarlar", to: "/admin/settings", icon: Settings },
] as const;

const getPageTitle = (pathname: string) => {
  if (pathname.startsWith("/admin/stats")) return "İstatistikler";
  if (pathname.startsWith("/admin/users")) return "Üyeler";
  if (pathname.startsWith("/admin/settings")) return "Ayarlar";
  return "Ana Sayfa";
};

const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [membershipAction, setMembershipAction] = useState<{
    member: AdminMemberDetail;
    targetMembership: AdminMembershipTarget;
  } | null>(null);
  const [membershipReasonCode, setMembershipReasonCode] = useState<AdminMembershipReasonCode | null>(null);
  const [accountStatusAction, setAccountStatusAction] = useState<{
    member: AdminMemberDetail;
    targetStatus: AdminAccountStatusTarget;
  } | null>(null);
  const [accountStatusReasonCode, setAccountStatusReasonCode] = useState<AdminAccountStatusReasonCode | null>(null);
  const { status, adminContext, error, refreshAdminContext } = useAdminGate();
  const isHomeRoute = location.pathname === "/admin";
  const isUsersRoute = location.pathname === "/admin/users";
  const isSettingsRoute = location.pathname === "/admin/settings";
  const adminHomeMembers = useAdminMembers(status === "admin" && isHomeRoute);
  const adminMembers = useAdminMembers(status === "admin" && isUsersRoute);
  const memberDetail = useAdminMemberDetail(status === "admin" && isUsersRoute && selectedUserId !== null, selectedUserId);
  const memberActions = useAdminMemberActions();
  const accountStatusActions = useAdminAccountStatusActions();
  const isSuperManager = adminContext?.is_super_manager === true;
  const featureAccessMatrix = useAdminFeatureAccessMatrix(isSettingsRoute && isSuperManager);

  const closeMemberDetail = useCallback(() => {
    setSelectedUserId(null);
    setMembershipAction(null);
    setMembershipReasonCode(null);
    setAccountStatusAction(null);
    setAccountStatusReasonCode(null);
    memberDetail.clear();
  }, [memberDetail]);

  const prepareAccountStatusChange = useCallback((member: AdminMemberDetail, targetStatus: AdminAccountStatusTarget) => {
    if (
      !member.admin_manageable ||
      member.user_id === adminContext?.user_id ||
      (member.account_status !== "active" && member.account_status !== "suspended") ||
      (targetStatus !== "active" && targetStatus !== "suspended")
    ) {
      return;
    }

    accountStatusActions.reset();
    setAccountStatusAction({ member, targetStatus });
    setAccountStatusReasonCode(null);
  }, [accountStatusActions, adminContext?.user_id]);

  const closeAccountStatusAction = useCallback((open: boolean) => {
    if (open) return;

    accountStatusActions.reset();
    setAccountStatusAction(null);
    setAccountStatusReasonCode(null);
  }, [accountStatusActions]);

  const prepareMembershipChange = useCallback((member: AdminMemberDetail, targetMembership: AdminMembershipTarget) => {
    memberActions.clearOutcome();
    setMembershipAction({ member, targetMembership });
    setMembershipReasonCode(null);
  }, [memberActions]);

  const closeMembershipAction = useCallback((open: boolean) => {
    if (open) return;

    memberActions.clearOutcome();
    setMembershipAction(null);
    setMembershipReasonCode(null);
  }, [memberActions]);

  const handleMembershipConfirm = useCallback(async () => {
    if (!membershipAction || !membershipReasonCode) return;

    const changed = await memberActions.changeMembership(
      membershipAction.member.user_id,
      membershipAction.targetMembership,
      membershipReasonCode,
    );

    if (!changed) {
      return;
    }

    adminMembers.refresh();
    memberDetail.refresh();
    toast.success("Üyelik güncellendi.");
    memberActions.clearOutcome();
    setMembershipAction(null);
    setMembershipReasonCode(null);
  }, [adminMembers, memberActions, memberDetail, membershipAction, membershipReasonCode]);

  const handleAccountStatusConfirm = useCallback(async () => {
    if (!accountStatusAction || !accountStatusReasonCode) return;

    const { member, targetStatus } = accountStatusAction;
    const currentStatus = member.account_status;
    const isValidReason =
      (currentStatus === "active" &&
        targetStatus === "suspended" &&
        ["policy_violation", "payment_issue", "user_request", "admin_correction"].includes(accountStatusReasonCode)) ||
      (currentStatus === "suspended" &&
        targetStatus === "active" &&
        ["reactivation_approved", "admin_correction"].includes(accountStatusReasonCode));

    if (
      !member.admin_manageable ||
      member.user_id === adminContext?.user_id ||
      (currentStatus !== "active" && currentStatus !== "suspended") ||
      (targetStatus !== "active" && targetStatus !== "suspended") ||
      currentStatus === targetStatus ||
      !isValidReason
    ) {
      return;
    }

    const changed = await accountStatusActions.changeAccountStatus({
      targetUserId: member.user_id,
      newStatus: targetStatus,
      reasonCode: accountStatusReasonCode,
    });

    if (!changed) {
      return;
    }

    adminMembers.refresh();
    memberDetail.refresh();
    toast.success(targetStatus === "suspended" ? "Hesap askıya alındı." : "Hesap yeniden aktif edildi.");
    accountStatusActions.reset();
    setAccountStatusAction(null);
    setAccountStatusReasonCode(null);
  }, [accountStatusAction, accountStatusActions, accountStatusReasonCode, adminContext?.user_id, adminMembers, memberDetail]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm tracking-widest">Yükleniyor...</span>
      </div>
    );
  }

  if (status === "signed_out") {
    return <Navigate to="/auth" replace />;
  }

  if (status === "not_admin" || status === "error") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
        <main className="w-full max-w-md border border-border/70 bg-card px-6 py-7 shadow-sm">
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="h-10 w-10 border border-border/70 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-medium tracking-wide text-foreground">Bu alana erişim yetkiniz yok</h1>
                <p className="text-sm leading-6 text-muted-foreground">
                  Admin paneline erişmek için yetkili bir hesapla giriş yapmanız gerekir.
                </p>
              </div>
            </div>

            {error && <p className="text-xs leading-5 text-destructive">{error.message}</p>}

            <div className="flex flex-col gap-2 sm:flex-row">
              {status === "error" && (
                <Button type="button" variant="outline" onClick={refreshAdminContext} className="flex-1">
                  Tekrar dene
                </Button>
              )}
              <Button type="button" onClick={() => navigate("/")} className="flex-1">
                Ana uygulamaya dön
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border/70 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-border/70">
              <ShieldCheck className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-medium tracking-wide text-foreground">Neverfap Admin Panel</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                Operasyonel üye yönetimi, erişim kontrolleri ve admin kayıtları
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <AdminSidebar />

          <section className="min-w-0 space-y-4">
            <div className="border-b border-border/70 pb-4">
              <h2 className="text-xl font-medium tracking-wide text-foreground">{getPageTitle(location.pathname)}</h2>
            </div>

            <Routes>
              <Route index element={<AdminHomePage members={adminHomeMembers} />} />
              <Route path="stats" element={<AdminStatsPage />} />
              <Route
                path="users"
                element={
                  <AdminUsersPage
                    adminMembers={adminMembers}
                    memberDetail={memberDetail}
                    currentAdminUserId={adminContext?.user_id ?? null}
                    onSelectMember={setSelectedUserId}
                    onPrepareAccountStatusChange={prepareAccountStatusChange}
                    onPrepareMembershipChange={prepareMembershipChange}
                    selectedUserId={selectedUserId}
                    onDialogOpenChange={(open) => {
                      if (!open) {
                        closeMemberDetail();
                      }
                    }}
                  />
                }
              />
              <Route
                path="settings"
                element={
                  <AdminSettingsPage
                    isSuperManager={isSuperManager}
                    featureAccessMatrix={featureAccessMatrix}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </section>
        </div>

        <AdminAccountStatusActionModal
          member={status === "admin" ? accountStatusAction?.member ?? null : null}
          open={status === "admin" && accountStatusAction !== null}
          targetStatus={accountStatusAction?.targetStatus ?? null}
          reasonCode={accountStatusReasonCode}
          onReasonCodeChange={setAccountStatusReasonCode}
          onOpenChange={closeAccountStatusAction}
          onConfirm={handleAccountStatusConfirm}
          loading={accountStatusActions.loading}
          errorMessage={accountStatusActions.errorMessage}
        />

        <AdminMemberActionModal
          member={status === "admin" ? membershipAction?.member ?? null : null}
          open={status === "admin" && membershipAction !== null}
          targetMembership={membershipAction?.targetMembership ?? null}
          reasonCode={membershipReasonCode}
          onReasonCodeChange={setMembershipReasonCode}
          onOpenChange={closeMembershipAction}
          onConfirm={handleMembershipConfirm}
          loading={memberActions.loading}
          errorMessage={memberActions.errorMessage}
        />
      </main>
    </div>
  );
};

const AdminSidebar = () => (
  <aside className="border border-border/70 bg-card/60 p-2 lg:sticky lg:top-6 lg:self-start">
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible" aria-label="Admin menüsü">
      {adminNavigationItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-none border px-3 text-sm transition-colors",
                isActive
                  ? "border-border bg-background text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-background/60 hover:text-foreground",
              ].join(" ")
            }
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  </aside>
);

const AdminStatsPage = () => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminMetricPlaceholderCard title="Son 24 saatte aktif üyeler" status="Veri altyapısı gerekiyor" />
      <AdminMetricPlaceholderCard title="Haftalık aktif kullanıcı" status="Veri altyapısı gerekiyor" />
      <AdminMetricPlaceholderCard title="7 gündür pasif üyeler" status="Veri altyapısı gerekiyor" />
      <AdminMetricPlaceholderCard title="Son 30 günde yeni kayıt sayısı" status="Veri altyapısı gerekiyor" />
    </div>

    <Card className="rounded-none border-border/70 shadow-none">
      <CardHeader className="space-y-1 p-5">
        <CardTitle className="text-base font-medium tracking-wide">Grand plan metrikleri</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 px-5 pb-5 pt-0 md:grid-cols-2">
        {[
          "Modül kullanım oranları",
          "Ortalama günlük kullanım süresi",
          "Üye başı ortalama çalışma süresi",
          "Üye başı ortalama tamamlanan task sayısı",
          "Üye başı ortalama tamamlanan pomodoro seansı sayısı",
          "Haftalık / aylık trend grafikler",
        ].map((metric) => (
          <div key={metric} className="flex items-center justify-between gap-3 border border-border/60 px-3 py-2">
            <span className="text-sm text-foreground">{metric}</span>
            <span className="shrink-0 text-xs text-muted-foreground">Veri altyapısı gerekiyor</span>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

type AdminHomePageProps = {
  members: ReturnType<typeof useAdminMembers>;
};

const AdminHomePage = ({ members }: AdminHomePageProps) => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        title="Toplam üye"
        value={members.loading ? null : String(members.totalCount)}
        status="Veri altyapısı gerekiyor"
      />
      <AdminMetricPlaceholderCard title="Son 24 saatte aktif üyeler" status="Aggregate veri bekliyor" />
      <AdminMetricPlaceholderCard title="7 gündür pasif üyeler" status="Aggregate veri bekliyor" />
      <AdminMetricPlaceholderCard title="Son 7 gün yeni üyeler" status="Aggregate veri bekliyor" />
    </div>

    <AdminHomeMemberList members={members} />
  </div>
);

type AdminUsersPageProps = {
  adminMembers: ReturnType<typeof useAdminMembers>;
  memberDetail: ReturnType<typeof useAdminMemberDetail>;
  currentAdminUserId: string | null;
  onSelectMember: (userId: string) => void;
  onPrepareAccountStatusChange: (member: AdminMemberDetail, targetStatus: AdminAccountStatusTarget) => void;
  onPrepareMembershipChange: (member: AdminMemberDetail, targetMembership: AdminMembershipTarget) => void;
  selectedUserId: string | null;
  onDialogOpenChange: (open: boolean) => void;
};

const AdminUsersPage = ({
  adminMembers,
  memberDetail,
  currentAdminUserId,
  onSelectMember,
  onPrepareAccountStatusChange,
  onPrepareMembershipChange,
  selectedUserId,
  onDialogOpenChange,
}: AdminUsersPageProps) => (
  <div className="space-y-4">
    <AdminMembersTable members={adminMembers} onSelectMember={onSelectMember} />

    <AdminMemberDetailDialog
      open={selectedUserId !== null}
      onOpenChange={onDialogOpenChange}
      detail={memberDetail}
      currentAdminUserId={currentAdminUserId}
      onPrepareAccountStatusChange={onPrepareAccountStatusChange}
      onPrepareMembershipChange={onPrepareMembershipChange}
    />
  </div>
);

type AdminSettingsPageProps = {
  isSuperManager: boolean;
  featureAccessMatrix: ReturnType<typeof useAdminFeatureAccessMatrix>;
};

const AdminSettingsPage = ({ isSuperManager, featureAccessMatrix }: AdminSettingsPageProps) => (
  <div className="space-y-4">
    <div className="grid gap-4 md:grid-cols-2">
      <AdminPlaceholderCard title="Admin kullanıcıları" icon={ShieldCheck} />
      <AdminPlaceholderCard title="Roller" icon={Users} />
    </div>

    {isSuperManager ? (
      <>
        <AdminFeatureAccessMatrixPanel
          items={featureAccessMatrix.items}
          isLoading={featureAccessMatrix.isLoading}
          error={featureAccessMatrix.error}
          onRetry={featureAccessMatrix.refetch}
        />
        <AdminAuditLogPanel enabled={isSuperManager} isSuperManager={isSuperManager} />
      </>
    ) : (
      <Card className="rounded-none border-border/70 shadow-none">
        <CardHeader className="space-y-0 p-5">
          <CardTitle className="text-base font-medium tracking-wide">Super manager alanları</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <p className="text-sm leading-6 text-muted-foreground">
            Audit Log ve Erişim Matrisi yalnızca super manager yetkisine sahip adminler için görünür.
          </p>
        </CardContent>
      </Card>
    )}
  </div>
);

type AdminHomeMemberListProps = {
  members: ReturnType<typeof useAdminMembers>;
};

const renderMembershipLabel = (value: string | null) => (
  <span className="inline-flex border border-border/70 px-2 py-1 text-xs text-foreground">
    {value ?? "-"}
  </span>
);

const AdminHomeMemberList = ({ members }: AdminHomeMemberListProps) => (
  <Card className="rounded-none border-border/70 shadow-none">
    <CardHeader className="space-y-1 p-5">
      <CardTitle className="text-base font-medium tracking-wide">Operasyonel üye listesi</CardTitle>
      <p className="text-sm text-muted-foreground">Mevcut admin üye sorgusundan gelen ilk kayıtlar.</p>
    </CardHeader>
    <CardContent className="px-5 pb-5 pt-0">
      {members.error && (
        <div className="border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-destructive">Üye özeti alınamadı.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{members.error.message}</p>
        </div>
      )}

      {!members.error && members.loading && (
        <div className="border border-border/70 p-6 text-sm text-muted-foreground">Üye özeti yükleniyor...</div>
      )}

      {!members.error && !members.loading && members.items.length === 0 && (
        <div className="border border-border/70 p-6 text-sm text-muted-foreground">
          Üye özeti için veri bulunamadı.
        </div>
      )}

      {!members.error && members.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-[760px] w-full border-collapse">
            <thead>
              <tr className="border-b border-border/70">
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Ad soyad</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">E-posta</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Plan</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Kayıt tarihi</th>
                <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Aktiflik durumu</th>
              </tr>
            </thead>
            <tbody>
              {members.items.map((member) => (
                <tr key={member.user_id} className="border-b border-border/50 last:border-b-0">
                  <td className="px-3 py-3 text-sm text-foreground">{member.full_name ?? "-"}</td>
                  <td className="px-3 py-3 text-sm text-foreground">{member.email ?? "-"}</td>
                  <td className="px-3 py-3">{renderMembershipLabel(member.membership)}</td>
                  <td className="px-3 py-3 text-sm text-foreground">{formatDate(member.created_at)}</td>
                  <td className="px-3 py-3">{getActivityLabel(member.last_seen_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CardContent>
  </Card>
);

const AdminMetricCard = ({ title, value, status }: { title: string; value: string | null; status: string }) => (
  <Card className="rounded-none border-border/70 shadow-none">
    <CardHeader className="space-y-0 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center border border-border/70">
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-sm font-medium tracking-wide">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="px-5 pb-5 pt-0">
      {value !== null ? (
        <p className="text-3xl font-medium tracking-wide text-foreground">{value}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{status}</p>
      )}
    </CardContent>
  </Card>
);

const AdminMetricPlaceholderCard = ({ title, status }: { title: string; status: string }) => (
  <Card className="rounded-none border-border/70 shadow-none">
    <CardHeader className="space-y-0 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center border border-border/70">
          <Activity className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-sm font-medium tracking-wide">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="px-5 pb-5 pt-0">
      <p className="text-xs text-muted-foreground">{status}</p>
    </CardContent>
  </Card>
);

const formatDate = (value: string | null) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(date);
};

const getActivityLabel = (value: string | null) => {
  if (!value) {
    return <span className="text-sm text-muted-foreground">Bilinmiyor</span>;
  }

  const lastSeen = new Date(value);
  if (Number.isNaN(lastSeen.getTime())) {
    return <span className="text-sm text-muted-foreground">Bilinmiyor</span>;
  }

  const now = new Date();
  const diffMs = now.getTime() - lastSeen.getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  if (diffMs <= oneDay) {
    return <span className="text-sm text-foreground">Son 24 saat aktif</span>;
  }

  if (diffMs <= sevenDays) {
    return <span className="text-sm text-foreground">Son 7 gün aktif</span>;
  }

  return <span className="text-sm text-muted-foreground">Pasif</span>;
};

type AdminPlaceholderCardProps = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
};

const AdminPlaceholderCard = ({ title, icon: Icon }: AdminPlaceholderCardProps) => (
  <Card className="rounded-none border-border/70 shadow-none">
    <CardHeader className="space-y-0 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center border border-border/70">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <CardTitle className="text-base font-medium tracking-wide">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="px-5 pb-5 pt-0">
      <p className="text-sm text-muted-foreground">Yakında</p>
    </CardContent>
  </Card>
);

export default Admin;
