import { AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AccountGatePayload, AccountGateStatus } from "@/hooks/useAccountGate";

type AccountGateScreenProps = {
  status: AccountGateStatus;
  gate: AccountGatePayload | null;
  error: Error | null;
  onRetry: () => void;
  onSignOut: () => void;
};

const CONTACT_EMAIL = "iletisim@neverfap.org";

const copyByStatus: Record<
  Exclude<AccountGateStatus, "loading" | "signed_out" | "allowed">,
  { title: string; body: string; showContact: boolean; allowRetry: boolean }
> = {
  suspended: {
    title: "Hesabınız geçici olarak askıya alındı",
    body: "Bu durumda uygulamanın ana özelliklerine erişemezsiniz.",
    showContact: true,
    allowRetry: false,
  },
  membership_inactive: {
    title: "Üyeliğiniz aktif değil",
    body: "Üyeliğiniz iptal edilmiş veya süresi dolmuş görünüyor.",
    showContact: true,
    allowRetry: false,
  },
  security_blocked: {
    title: "Güvenlik incelemesi gerekiyor",
    body: "Hesabınız güvenlik nedeniyle geçici olarak kısıtlandı.",
    showContact: true,
    allowRetry: false,
  },
  closed: {
    title: "Hesap erişimi kapalı",
    body: "Bu hesap için uygulama erişimi kapalıdır.",
    showContact: false,
    allowRetry: false,
  },
  error: {
    title: "Hesap durumu doğrulanamadı",
    body: "Lütfen tekrar giriş yapın veya destek ile iletişime geçin.",
    showContact: true,
    allowRetry: true,
  },
};

export const AccountGateScreen = ({ status, error, onRetry, onSignOut }: AccountGateScreenProps) => {
  const content = copyByStatus[status as keyof typeof copyByStatus] ?? copyByStatus.error;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <main className="w-full max-w-md border border-border/70 bg-card px-6 py-7 shadow-sm">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="h-10 w-10 border border-border/70 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-medium tracking-wide text-foreground">{content.title}</h1>
              <p className="text-sm leading-6 text-muted-foreground">{content.body}</p>
            </div>
          </div>

          {content.showContact && (
            <div className="border border-border/70 px-4 py-3 text-sm text-muted-foreground">
              İletişim: <span className="text-foreground">{CONTACT_EMAIL}</span>
            </div>
          )}

          {error && (
            <p className="text-xs leading-5 text-destructive">
              {error.message}
            </p>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            {content.allowRetry && (
              <Button type="button" variant="outline" onClick={onRetry} className="flex-1">
                <RefreshCw className="h-4 w-4" />
                Tekrar dene
              </Button>
            )}
            <Button type="button" onClick={onSignOut} className="flex-1">
              <LogOut className="h-4 w-4" />
              Çıkış yap
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};
