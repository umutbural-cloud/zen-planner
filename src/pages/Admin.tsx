import { Navigate, useNavigate } from "react-router-dom";
import { AlertTriangle, ClipboardList, Settings, ShieldCheck } from "lucide-react";
import { AdminMembersTable } from "@/components/admin/AdminMembersTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminGate } from "@/hooks/useAdminGate";
import { useAdminMembers } from "@/hooks/useAdminMembers";

const Admin = () => {
  const navigate = useNavigate();
  const { status, error, refreshAdminContext } = useAdminGate();
  const adminMembers = useAdminMembers(status === "admin");

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
          <AdminMembersTable members={adminMembers} />

          <div className="grid gap-4 md:grid-cols-2">
            <AdminPlaceholderCard title="Audit Log" icon={ClipboardList} />
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
