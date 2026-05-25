import { Navigate, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Settings, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import {
  AdminAccountStatusActionModal,
  type AdminAccountStatusReasonCode,
  type AdminAccountStatusTarget,
} from "@/components/admin/AdminAccountStatusActionModal";
import { AdminAuditLogPanel } from "@/components/admin/AdminAuditLogPanel";
import { AdminFeatureAccessMatrixPanel } from "@/components/admin/AdminFeatureAccessMatrixPanel";
import {
  AdminMemberActionModal,
  type AdminMembershipReasonCode,
  type AdminMembershipTarget,
} from "@/components/admin/AdminMemberActionModal";
import { AdminMemberDetailPanel } from "@/components/admin/AdminMemberDetailPanel";
import { AdminMembersTable } from "@/components/admin/AdminMembersTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminAccountStatusActions } from "@/hooks/useAdminAccountStatusActions";
import { useAdminGate } from "@/hooks/useAdminGate";
import type { AdminMemberDetail } from "@/hooks/useAdminMemberDetail";
import { useAdminMemberDetail } from "@/hooks/useAdminMemberDetail";
import { useAdminMembers } from "@/hooks/useAdminMembers";
import { useAdminMemberActions } from "@/hooks/useAdminMemberActions";

type AdminTab = "members" | "audit" | "feature-access";

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>("members");
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
  const adminMembers = useAdminMembers(status === "admin");
  const memberDetail = useAdminMemberDetail(status === "admin" && selectedUserId !== null, selectedUserId);
  const memberActions = useAdminMemberActions();
  const accountStatusActions = useAdminAccountStatusActions();
  const isSuperManager = adminContext?.is_super_manager === true;

  useEffect(() => {
    if (!isSuperManager && activeTab === "audit") {
      setActiveTab("members");
    }
    if (!isSuperManager && activeTab === "feature-access") {
      setActiveTab("members");
    }
  }, [activeTab, isSuperManager]);

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
        <span className="text-muted-foreground text-sm tracking-widest">読み込み中...</span>
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
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 border-b border-border/70 pb-6">
          <div className="flex h-11 w-11 items-center justify-center border border-border/70">
            <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-medium tracking-wide text-foreground">Neverfap Admin Panel</h1>
            <p className="text-sm leading-6 text-muted-foreground">Üye yönetimi ve hesap durumu işlemleri</p>
          </div>
        </header>

        <section className="space-y-4">
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              if (value === "audit" && !isSuperManager) {
                return;
              }

              setActiveTab(value === "audit" ? "audit" : "members");
            }}
          >
            <TabsList className="h-auto w-full justify-start rounded-none border border-border/70 bg-muted/30 p-1">
              <TabsTrigger value="members" className="rounded-none">
                Üyeler
              </TabsTrigger>
              {isSuperManager && (
                <>
                  <TabsTrigger value="audit" className="rounded-none">
                    Audit Log
                  </TabsTrigger>
                  <TabsTrigger value="feature-access" className="rounded-none">
                    Erişim Matrisi
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="members" className="mt-4">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <AdminMembersTable members={adminMembers} onSelectMember={setSelectedUserId} />
                <AdminMemberDetailPanel
                  detail={memberDetail}
                  currentAdminUserId={adminContext?.user_id ?? null}
                  onClose={closeMemberDetail}
                  onPrepareAccountStatusChange={prepareAccountStatusChange}
                  onPrepareMembershipChange={prepareMembershipChange}
                />
              </div>
            </TabsContent>

            {activeTab === "audit" && isSuperManager && (
              <TabsContent value="audit" className="mt-4">
                <AdminAuditLogPanel enabled={activeTab === "audit" && isSuperManager} isSuperManager={isSuperManager} />
              </TabsContent>
            )}

            {activeTab === "feature-access" && isSuperManager && (
              <TabsContent value="feature-access" className="mt-4">
                <AdminFeatureAccessMatrixPanel isSuperManager={isSuperManager} />
              </TabsContent>
            )}
          </Tabs>

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

          <div className="grid gap-4 md:grid-cols-2">
            <AdminPlaceholderCard title="Ayarlar" icon={Settings} />
          </div>
        </section>
      </main>
    </div>
  );
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
