import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SettingsSection } from "./SettingsSection";

const fallbackFullName = (email?: string, fullName?: unknown) => {
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  if (email) return email.split("@")[0] || "Kullanıcı";
  return "Kullanıcı";
};

const emailLooksValid = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const SettingsAccountSecurityPage = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(fallbackFullName(user?.email, user?.user_metadata?.full_name));
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingFullName, setSavingFullName] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    setFullName(fallbackFullName(user?.email, user?.user_metadata?.full_name));
    setEmail(user?.email || "");
  }, [user?.email, user?.user_metadata?.full_name]);

  const baselineFullName = useMemo(
    () => fallbackFullName(user?.email, user?.user_metadata?.full_name),
    [user?.email, user?.user_metadata?.full_name],
  );

  const trimmedFullName = fullName.trim();
  const trimmedEmail = email.trim();
  const passwordSupported = Boolean(user?.email);

  const handleFullName = async () => {
    if (!trimmedFullName) {
      toast.error("Ad Soyad boş olamaz.");
      return;
    }
    if (trimmedFullName === baselineFullName) return;

    setSavingFullName(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: trimmedFullName } });
    setSavingFullName(false);

    if (error) toast.error(error.message);
    else toast.success("Ad Soyad güncellendi");
  };

  const handleEmail = async () => {
    if (!trimmedEmail) return;
    if (!emailLooksValid(trimmedEmail)) {
      toast.error("Geçerli bir e-posta girin.");
      return;
    }
    if (trimmedEmail === (user?.email || "")) return;

    setSavingEmail(true);
    const { error } = await supabase.auth.updateUser({ email: trimmedEmail });
    setSavingEmail(false);

    if (error) toast.error(error.message);
    else toast.success("Doğrulama e-postası gönderildi");
  };

  const handlePassword = async () => {
    if (!passwordSupported || !user?.email) return;
    if (!currentPassword) {
      toast.error("Mevcut şifreni gir.");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Yeni şifreler eşleşmiyor.");
      return;
    }

    setSavingPassword(true);
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (reauthError) {
      setSavingPassword(false);
      toast.error("Mevcut şifre doğrulanamadı.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      toast.error(error.message || "Şifre güncellenemedi.");
      return;
    }

    toast.success("Şifre güncellendi");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  return (
    <div className="space-y-6">
      <SettingsSection
        title="Profil bilgileri"
        description="Zen Planner içinde görünen temel hesap bilgilerini düzenle."
      >
        <div className="space-y-5">
          <div className="grid gap-3">
            <label className="text-sm font-medium text-foreground" htmlFor="settings-full-name">
              Ad Soyad
            </label>
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                id="settings-full-name"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="h-11 border-transparent bg-muted/55 shadow-none"
              />
              <Button
                type="button"
                onClick={() => void handleFullName()}
                disabled={savingFullName || !trimmedFullName || trimmedFullName === baselineFullName}
                className="h-11 min-w-44"
              >
                {savingFullName ? "Kaydediliyor..." : "Ad Soyadı Kaydet"}
              </Button>
            </div>
          </div>

          <div className="grid gap-3">
            <label className="text-sm font-medium text-foreground" htmlFor="settings-email">
              Hesap e-postası
            </label>
            <div className="flex flex-col gap-3 md:flex-row">
              <Input
                id="settings-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 border-transparent bg-muted/55 shadow-none"
              />
              <Button
                type="button"
                onClick={() => void handleEmail()}
                disabled={savingEmail || !trimmedEmail || trimmedEmail === (user?.email || "")}
                className="h-11 min-w-44"
              >
                {savingEmail ? "Gönderiliyor..." : "E-postayı Güncelle"}
              </Button>
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              E-posta değişikliği doğrulama gerektirebilir.
            </p>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Şifre değiştir"
        description="Hesabının güvenliği için güçlü ve benzersiz bir şifre kullan."
      >
        <div className="space-y-4">
          {!passwordSupported && (
            <p className="text-sm leading-6 text-muted-foreground">
              Şifre değiştirme yalnızca e-posta ile giriş yapan hesaplarda desteklenir.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2 md:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-current-password">
                Eski Şifre
              </label>
              <Input
                id="settings-current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                disabled={!passwordSupported || savingPassword}
                className="h-11 border-transparent bg-muted/55 shadow-none"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-new-password">
                Yeni Şifre
              </label>
              <Input
                id="settings-new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                disabled={!passwordSupported || savingPassword}
                className="h-11 border-transparent bg-muted/55 shadow-none"
              />
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground" htmlFor="settings-confirm-password">
                Yeni Şifre Tekrarı
              </label>
              <Input
                id="settings-confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                disabled={!passwordSupported || savingPassword}
                className="h-11 border-transparent bg-muted/55 shadow-none"
              />
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-6 text-muted-foreground">
              Yeni şifre en az 6 karakter olmalı ve mevcut şifren doğrulanmadan güncellenmez.
            </p>
            <Button
              type="button"
              onClick={() => void handlePassword()}
              disabled={!passwordSupported || savingPassword}
              className="h-11 min-w-40"
            >
              {savingPassword ? "Güncelleniyor..." : "Şifreyi Güncelle"}
            </Button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Oturum ve güvenlik" description="Hesabınla ilgili mevcut güvenlik bilgisini görüntüle.">
        <div className="divide-y divide-muted/60">
          {[
            { icon: Mail, title: "Aktif hesap", description: user?.email || "Oturum bilgisi yok" },
            { icon: UserRound, title: "Giriş yöntemi", description: user?.email ? "E-posta ile giriş" : "Supabase Auth" },
            { icon: ShieldCheck, title: "Oturum yönetimi", description: "Tüm cihazlardan çıkış ve oturum geçmişi sonraki güvenlik fazında ele alınacak." },
            { icon: LockKeyhole, title: "İki aşamalı doğrulama", description: "Bu özellik sonraki fazda değerlendirilecek." },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/45 text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsSection>

      <SettingsSection title="Hesap silme" description="Hesap silme ve tüm verileri kalıcı kaldırma işlemi ayrı güvenlik akışı ve ek onay gerektirir.">
        <div className="inline-flex items-center gap-2 rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Ayrı faz
        </div>
      </SettingsSection>
    </div>
  );
};
