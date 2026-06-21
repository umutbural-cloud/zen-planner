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
import {
  AdminMemberSoftDeleteActionModal,
  type AdminSoftDeleteActionMode,
  type AdminSoftDeleteReasonCode,
  type AdminSoftDeleteTarget,
} from "@/components/admin/AdminMemberSoftDeleteActionModal";
import { AdminDeletedMembersSection } from "@/components/admin/AdminDeletedMembersSection";
import { AdminMembersTable } from "@/components/admin/AdminMembersTable";
import { formatLastSeenWindow } from "@/components/admin/adminDateDisplay";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAccountStatusActions } from "@/hooks/useAdminAccountStatusActions";
import { useAdminGate } from "@/hooks/useAdminGate";
import { useAdminFeatureAccessMatrix } from "@/hooks/useAdminFeatureAccessMatrix";
import type { AdminMemberDetail } from "@/hooks/useAdminMemberDetail";
import { useAdminMemberDetail } from "@/hooks/useAdminMemberDetail";
import { useAdminMembers } from "@/hooks/useAdminMembers";
import { useAdminMemberActions } from "@/hooks/useAdminMemberActions";
import { useAdminMemberSoftDeleteActions } from "@/hooks/useAdminMemberSoftDeleteActions";
import { useAdminMemberStats } from "@/hooks/useAdminMemberStats";

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
  const [softDeleteAction, setSoftDeleteAction] = useState<{
    member: AdminSoftDeleteTarget;
    mode: AdminSoftDeleteActionMode;
  } | null>(null);
  const [softDeleteReasonCode, setSoftDeleteReasonCode] = useState("");
  const [softDeleteConfirmText, setSoftDeleteConfirmText] = useState("");
  const [deletedMembersOpen, setDeletedMembersOpen] = useState(false);
  const { status, adminContext, error, refreshAdminContext } = useAdminGate();
  const isHomeRoute = location.pathname === "/admin";
  const isStatsRoute = location.pathname === "/admin/stats";
  const isUsersRoute = location.pathname === "/admin/users";
  const isSettingsRoute = location.pathname === "/admin/settings";
  const adminHomeMembers = useAdminMembers(status === "admin" && isHomeRoute);
  const adminMembers = useAdminMembers(status === "admin" && isUsersRoute);
  const deletedMembers = useAdminMembers(
    status === "admin" && isUsersRoute && deletedMembersOpen,
    { initialAccountStatus: "deleted" },
  );
  const adminMemberStats = useAdminMemberStats(status === "admin" && (isHomeRoute || isStatsRoute));
  const memberDetail = useAdminMemberDetail(status === "admin" && isUsersRoute && selectedUserId !== null, selectedUserId);
  const memberActions = useAdminMemberActions();
  const accountStatusActions = useAdminAccountStatusActions();
  const softDeleteActions = useAdminMemberSoftDeleteActions();
  const isSuperManager = adminContext?.is_super_manager === true;
  const featureAccessMatrix = useAdminFeatureAccessMatrix(isSettingsRoute && isSuperManager);

  const closeMemberDetail = useCallback(() => {
    setSelectedUserId(null);
    setMembershipAction(null);
    setMembershipReasonCode(null);
    setAccountStatusAction(null);
    setAccountStatusReasonCode(null);
    setSoftDeleteAction(null);
    setSoftDeleteReasonCode("");
    setSoftDeleteConfirmText("");
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

  const prepareArchiveMember = useCallback((member: AdminSoftDeleteTarget) => {
    if (!isSuperManager) return;

    softDeleteActions.reset();
    setSoftDeleteAction({ member, mode: "archive" });
    setSoftDeleteReasonCode("");
    setSoftDeleteConfirmText("");
  }, [isSuperManager, softDeleteActions]);

  const prepareRestoreMember = useCallback((member: AdminSoftDeleteTarget) => {
    if (!isSuperManager) return;

    softDeleteActions.reset();
    setSoftDeleteAction({ member, mode: "restore" });
    setSoftDeleteReasonCode("");
    setSoftDeleteConfirmText("");
  }, [isSuperManager, softDeleteActions]);

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

  const closeSoftDeleteAction = useCallback((open: boolean) => {
    if (open) return;

    softDeleteActions.reset();
    setSoftDeleteAction(null);
    setSoftDeleteReasonCode("");
    setSoftDeleteConfirmText("");
  }, [softDeleteActions]);

  const handleSoftDeleteConfirm = useCallback(async () => {
    if (!softDeleteAction || !softDeleteReasonCode.trim()) return;

    const normalizedConfirm = softDeleteConfirmText.trim().toUpperCase();
    const expectedConfirm = softDeleteAction.mode === "archive" ? "SİLİNENLERE TAŞI" : "GERİ AL";

    if (normalizedConfirm !== expectedConfirm) {
      return;
    }

    const actionTarget = {
      targetUserId: softDeleteAction.member.user_id,
      reasonCode: softDeleteReasonCode.trim() as AdminSoftDeleteReasonCode,
      reasonNote: null,
    };

    const changed =
      softDeleteAction.mode === "archive"
        ? await softDeleteActions.archiveMember(actionTarget)
        : await softDeleteActions.restoreMember(actionTarget);

    if (!changed) {
      return;
    }

    adminMembers.refresh();
    deletedMembers.refresh();
    memberDetail.refresh();
    toast.success(softDeleteAction.mode === "archive" ? "Üye silinenlere taşındı." : "Üye geri alındı.");
    softDeleteActions.reset();
    setSoftDeleteAction(null);
    setSoftDeleteReasonCode("");
    setSoftDeleteConfirmText("");
  }, [adminMembers, deletedMembers, memberDetail, softDeleteAction, softDeleteActions, softDeleteConfirmText, softDeleteReasonCode]);

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
              <Route index element={<AdminHomePage members={adminHomeMembers} stats={adminMemberStats} />} />
              <Route path="stats" element={<AdminStatsPage stats={adminMemberStats} />} />
              <Route
                path="users"
                element={
                  <AdminUsersPage
                    adminMembers={adminMembers}
                    deletedMembers={deletedMembers}
                    deletedMembersOpen={deletedMembersOpen}
                    memberDetail={memberDetail}
                    currentAdminUserId={adminContext?.user_id ?? null}
                    isSuperManager={isSuperManager}
                    onSelectMember={setSelectedUserId}
                    onPrepareAccountStatusChange={prepareAccountStatusChange}
                    onPrepareMembershipChange={prepareMembershipChange}
                    onPrepareArchiveMember={prepareArchiveMember}
                    onPrepareRestoreMember={prepareRestoreMember}
                    onOpenChangeDeletedMembers={setDeletedMembersOpen}
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

        <AdminMemberSoftDeleteActionModal
          member={status === "admin" ? softDeleteAction?.member ?? null : null}
          open={status === "admin" && softDeleteAction !== null}
          mode={softDeleteAction?.mode ?? null}
          reasonCode={softDeleteReasonCode}
          confirmText={softDeleteConfirmText}
          onReasonCodeChange={setSoftDeleteReasonCode}
          onConfirmTextChange={setSoftDeleteConfirmText}
          onOpenChange={closeSoftDeleteAction}
          onConfirm={handleSoftDeleteConfirm}
          loading={softDeleteActions.loading}
          errorMessage={softDeleteActions.errorMessage}
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

type AdminStatsPageProps = {
  stats: ReturnType<typeof useAdminMemberStats>;
};

const AdminStatsPage = ({ stats }: AdminStatsPageProps) => {
  return (
    <div className="space-y-4">
      <Card className="rounded-none border-border/70 shadow-none">
        <CardContent className="px-5 py-4">
          <p className="text-sm leading-6 text-muted-foreground">
            Bu istatistikler, mevcut admin üye sorgusundan dönen operasyonel metadata üzerinden hesaplanır. Kişisel
            içerikler gösterilmez.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <AdminStatsMetricCard
          title="Toplam üye"
          value={stats.loading ? null : stats.error ? null : String(stats.totalCount)}
          pendingText={stats.loading ? "Hesaplanıyor..." : stats.error ? "Veri alınamadı" : null}
          partialText={stats.isPartial ? "İlk 5000 kayıt üzerinden hesaplandı." : null}
          description="Toplam kayıtlı üye sayısı."
        />
        <AdminStatsMetricCard
          title="Son 24 saatte aktif üyeler"
          value={stats.loading ? null : stats.error ? null : String(stats.active24hCount)}
          pendingText={stats.loading ? "Hesaplanıyor..." : stats.error ? "Veri alınamadı" : null}
          partialText={stats.isPartial ? "İlk 5000 kayıt üzerinden hesaplandı." : null}
          description="Son 24 saat içinde uygulamada görünen üyeler."
        />
        <AdminStatsMetricCard
          title="Haftalık aktif kullanıcı"
          value={stats.loading ? null : stats.error ? null : String(stats.weeklyActiveCount)}
          pendingText={stats.loading ? "Hesaplanıyor..." : stats.error ? "Veri alınamadı" : null}
          partialText={stats.isPartial ? "İlk 5000 kayıt üzerinden hesaplandı." : null}
          description="WAU takibi için haftalık aggregate veri gerekir."
        />
        <AdminStatsMetricCard
          title="7 gündür pasif üyeler"
          value={stats.loading ? null : stats.error ? null : String(stats.inactive7dCount)}
          pendingText={stats.loading ? "Hesaplanıyor..." : stats.error ? "Veri alınamadı" : null}
          partialText={stats.isPartial ? "İlk 5000 kayıt üzerinden hesaplandı." : null}
          description="Son 7 gün içinde aktifliği görünmeyen üyeler."
        />
        <AdminStatsMetricCard
          title="Son 30 günde yeni kayıt"
          value={stats.loading ? null : stats.error ? null : String(stats.new30dCount)}
          pendingText={stats.loading ? "Hesaplanıyor..." : stats.error ? "Veri alınamadı" : null}
          partialText={stats.isPartial ? "İlk 5000 kayıt üzerinden hesaplandı." : null}
          description="Son 30 gün içinde kaydolan üyeler."
        />
        <AdminStatsMetricCard
          title="Son aktiflik bilinmiyor"
          value={stats.loading ? null : stats.error ? null : String(stats.unknownLastSeenCount)}
          pendingText={stats.loading ? "Hesaplanıyor..." : stats.error ? "Veri alınamadı" : null}
          partialText={stats.isPartial ? "İlk 5000 kayıt üzerinden hesaplandı." : null}
          description="Aktiflik tarihi bulunmayan üyeler."
        />
      </div>

      <Card className="rounded-none border-border/70 shadow-none">
        <CardHeader className="space-y-1 p-5">
          <CardTitle className="text-base font-medium tracking-wide">Veri altyapısı gerektiren metrikler</CardTitle>
          <p className="text-sm text-muted-foreground">Bu bölümdeki alanlar için güvenilir aggregate veri gerekiyor.</p>
        </CardHeader>
        <CardContent className="grid gap-3 px-5 pb-5 pt-0 md:grid-cols-2">
          {[
            "Modül kullanım oranları",
            "Ortalama günlük kullanım süresi",
            "Üye başı ortalama çalışma süresi",
            "Üye başı ortalama tamamlanan task sayısı",
            "Üye başı ortalama pomodoro seansı",
            "Haftalık / aylık trendler",
          ].map((metric) => (
            <AdminStatsRequirementCard key={metric} title={metric} />
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="rounded-none border-border/70 shadow-none">
          <CardHeader className="space-y-1 p-5">
            <CardTitle className="text-base font-medium tracking-wide">Veri güvenilirliği notu</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0">
            <p className="text-sm leading-6 text-muted-foreground">
              Bu ekranda yalnızca aggregate ve operasyonel metrikler gösterilir. Kişisel günlük, kriz notu, relapse
              analizi, check-in içeriği veya görev içeriği gösterilmez.
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-none border-border/70 shadow-none">
          <CardHeader className="space-y-1 p-5">
            <CardTitle className="text-base font-medium tracking-wide">Sonraki veri gereksinimleri</CardTitle>
            <p className="text-sm text-muted-foreground">Bu liste yalnızca altyapı planını görünür kılar.</p>
          </CardHeader>
          <CardContent className="space-y-2 px-5 pb-5 pt-0">
            {[
              "Günlük aktif kullanıcı aggregate sayacı",
              "Haftalık aktif kullanıcı aggregate sayacı",
              "Pasif kullanıcı aggregate sayacı",
              "Yeni kayıt aggregate sayacı",
              "Modül kullanım aggregate tablosu",
            ].map((item) => (
              <div key={item} className="border border-border/60 px-3 py-2 text-sm text-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

type AdminHomePageProps = {
  members: ReturnType<typeof useAdminMembers>;
  stats: ReturnType<typeof useAdminMemberStats>;
};

const AdminHomePage = ({ members, stats }: AdminHomePageProps) => (
  <div className="space-y-4">
    <Card className="rounded-none border-border/70 shadow-none">
      <CardContent className="px-5 py-4">
        <p className="text-sm leading-6 text-muted-foreground">
          Admin panelinin genel operasyon özetini buradan takip edebilirsin. Kişisel içerikler gösterilmez; yalnızca
          operasyonel ve aggregate veriler kullanılır.
        </p>
      </CardContent>
    </Card>

    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminMetricCard
        title="Toplam üye"
        value={stats.loading ? null : stats.error ? null : String(stats.totalCount)}
        pendingText={stats.loading ? "Hesaplanıyor..." : stats.error ? "Veri alınamadı" : null}
        partialText={stats.isPartial ? "İlk 5000 kayıt üzerinden hesaplandı." : null}
        description="Toplam kayıtlı üye sayısı."
      />
      <AdminMetricCard
        title="Son 24 saatte aktif üyeler"
        value={stats.loading ? null : stats.error ? null : String(stats.active24hCount)}
        pendingText={stats.loading ? "Hesaplanıyor..." : stats.error ? "Veri alınamadı" : null}
        partialText={stats.isPartial ? "İlk 5000 kayıt üzerinden hesaplandı." : null}
        description="Son 24 saat içinde uygulamada görünen üyeler."
      />
      <AdminMetricCard
        title="7 gündür pasif üyeler"
        value={stats.loading ? null : stats.error ? null : String(stats.inactive7dCount)}
        pendingText={stats.loading ? "Hesaplanıyor..." : stats.error ? "Veri alınamadı" : null}
        partialText={stats.isPartial ? "İlk 5000 kayıt üzerinden hesaplandı." : null}
        description="Son 7 gün içinde aktifliği görünmeyen üyeler."
      />
      <AdminMetricCard
        title="Son 7 gün yeni üyeler"
        value={stats.loading ? null : stats.error ? null : String(stats.new7dCount)}
        pendingText={stats.loading ? "Hesaplanıyor..." : stats.error ? "Veri alınamadı" : null}
        partialText={stats.isPartial ? "İlk 5000 kayıt üzerinden hesaplandı." : null}
        description="Son 7 gün içinde kaydolan üyeler."
      />
    </div>

    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <AdminHomeMemberList members={members} />
      <AdminQuickAccessCard />
    </div>

    <AdminDataNote />
  </div>
);

type AdminUsersPageProps = {
  adminMembers: ReturnType<typeof useAdminMembers>;
  deletedMembers: ReturnType<typeof useAdminMembers>;
  deletedMembersOpen: boolean;
  memberDetail: ReturnType<typeof useAdminMemberDetail>;
  currentAdminUserId: string | null;
  isSuperManager: boolean;
  onSelectMember: (userId: string) => void;
  onPrepareAccountStatusChange: (member: AdminMemberDetail, targetStatus: AdminAccountStatusTarget) => void;
  onPrepareArchiveMember: (member: AdminSoftDeleteTarget) => void;
  onPrepareRestoreMember: (member: AdminSoftDeleteTarget) => void;
  onPrepareMembershipChange: (member: AdminMemberDetail, targetMembership: AdminMembershipTarget) => void;
  onOpenChangeDeletedMembers: (open: boolean) => void;
  selectedUserId: string | null;
  onDialogOpenChange: (open: boolean) => void;
};

const AdminUsersPage = ({
  adminMembers,
  deletedMembers,
  deletedMembersOpen,
  memberDetail,
  currentAdminUserId,
  isSuperManager,
  onSelectMember,
  onPrepareAccountStatusChange,
  onPrepareArchiveMember,
  onPrepareRestoreMember,
  onPrepareMembershipChange,
  onOpenChangeDeletedMembers,
  selectedUserId,
  onDialogOpenChange,
}: AdminUsersPageProps) => (
  <div className="space-y-4">
    <AdminMembersTable members={adminMembers} onSelectMember={onSelectMember} />

    <AdminDeletedMembersSection
      members={deletedMembers}
      isSuperManager={isSuperManager}
      open={deletedMembersOpen}
      onOpenChange={onOpenChangeDeletedMembers}
      onSelectMember={onSelectMember}
      onRequestRestore={onPrepareRestoreMember}
    />

    <AdminMemberDetailDialog
      open={selectedUserId !== null}
      onOpenChange={onDialogOpenChange}
      detail={memberDetail}
      currentAdminUserId={currentAdminUserId}
      isSuperManager={isSuperManager}
      onPrepareAccountStatusChange={onPrepareAccountStatusChange}
      onPrepareArchiveMember={onPrepareArchiveMember}
      onPrepareRestoreMember={onPrepareRestoreMember}
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

const AdminHomeMemberList = ({ members }: AdminHomeMemberListProps) => {
  const visibleMembers = members.items.filter((member) => member.account_status !== "deleted");

  return (
    <Card className="rounded-none border-border/70 shadow-none">
      <CardHeader className="space-y-1 p-5">
        <CardTitle className="text-base font-medium tracking-wide">Operasyonel üye listesi</CardTitle>
        <p className="text-sm text-muted-foreground">Son görülen üyelere ait temel bilgiler.</p>
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

        {!members.error && !members.loading && visibleMembers.length === 0 && (
          <div className="border border-border/70 p-6 text-sm text-muted-foreground">
            Üye özeti için veri bulunamadı.
          </div>
        )}

        {!members.error && visibleMembers.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr className="border-b border-border/70">
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">AD SOYAD</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">E-POSTA</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">SON GÖRÜLME ARALIĞI</th>
                </tr>
              </thead>
              <tbody>
                {visibleMembers.map((member) => (
                  <tr key={member.user_id} className="border-b border-border/50 last:border-b-0">
                    <td className="px-3 py-3 text-sm text-foreground">{member.full_name ?? "-"}</td>
                    <td className="px-3 py-3 text-sm text-foreground">{member.email ?? "-"}</td>
                    <td className="px-3 py-3 text-sm text-foreground">{formatLastSeenWindow(member.last_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const AdminMetricCard = ({
  title,
  value,
  pendingText,
  partialText,
  description,
}: {
  title: string;
  value: string | null;
  pendingText: string | null;
  partialText: string | null;
  description: string;
}) => (
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
        <p className="text-xs text-muted-foreground">{pendingText}</p>
      )}
      {partialText && <p className="mt-2 text-xs text-muted-foreground">{partialText}</p>}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const AdminStatsMetricCard = ({
  title,
  value,
  pendingText,
  partialText,
  description,
}: {
  title: string;
  value: string | null;
  pendingText: string | null;
  partialText: string | null;
  description: string;
}) => (
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
        <p className="text-xs text-muted-foreground">{pendingText}</p>
      )}
      {partialText && <p className="mt-2 text-xs text-muted-foreground">{partialText}</p>}
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p>
    </CardContent>
  </Card>
);

const AdminStatsRequirementCard = ({ title }: { title: string }) => (
  <div className="flex items-start justify-between gap-3 border border-border/60 px-3 py-2">
    <span className="text-sm text-foreground">{title}</span>
    <DataPendingBadge label="Veri altyapısı gerekiyor" />
  </div>
);

const DataPendingBadge = ({ label }: { label: string }) => (
  <span className="inline-flex shrink-0 items-center border border-border/60 px-2 py-1 text-xs text-muted-foreground">
    {label}
  </span>
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

const AdminQuickAccessCard = () => (
  <Card className="rounded-none border-border/70 shadow-none">
    <CardHeader className="space-y-1 p-5">
      <CardTitle className="text-base font-medium tracking-wide">Hızlı erişim</CardTitle>
      <p className="text-sm text-muted-foreground">Sık kullanılan admin sayfalarına hızlı geçiş.</p>
    </CardHeader>
    <CardContent className="space-y-2 px-5 pb-5 pt-0">
      <NavLink
        to="/admin/users"
        className="flex items-center justify-between border border-border/70 px-3 py-3 text-sm text-foreground transition-colors hover:bg-muted/30"
      >
        <span>Üye yönetimine git</span>
        <span className="text-xs text-muted-foreground">/admin/users</span>
      </NavLink>
      <NavLink
        to="/admin/stats"
        className="flex items-center justify-between border border-border/70 px-3 py-3 text-sm text-foreground transition-colors hover:bg-muted/30"
      >
        <span>İstatistiklere git</span>
        <span className="text-xs text-muted-foreground">/admin/stats</span>
      </NavLink>
    </CardContent>
  </Card>
);

const AdminDataNote = () => (
  <Card className="rounded-none border-border/70 bg-muted/20 shadow-none">
    <CardContent className="px-5 py-4">
      <p className="text-xs leading-5 text-muted-foreground">
        Bu ekranda sahte metrik gösterilmez. Güvenilir aggregate verisi olmayan alanlar "veri altyapısı gerekiyor"
        olarak işaretlenir.
      </p>
    </CardContent>
  </Card>
);

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
