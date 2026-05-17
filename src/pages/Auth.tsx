import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

type Mode = "login" | "signup" | "forgot";

const Auth = () => {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "signup") {
        if (!fullName.trim()) {
          throw new Error("Lütfen ad ve soyadınızı girin.");
        }
        if (password.length < 6) {
          throw new Error("Şifre en az 6 karakter olmalı.");
        }
        if (password !== passwordConfirm) {
          throw new Error("Şifreler birbiriyle uyuşmuyor.");
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { full_name: fullName.trim() },
          },
        });
        if (error) throw error;
        toast({
          title: "確認メール送信済み",
          description: "E-posta adresinize doğrulama bağlantısı gönderildi.",
        });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast({
          title: "メール送信済み",
          description: "Şifre sıfırlama bağlantısı e-postanıza gönderildi.",
        });
        setMode("login");
      }
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword("");
    setPasswordConfirm("");
    setFullName("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: 'hsl(40, 23%, 97%)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl tracking-widest text-foreground">計画</h1>
          <p className="text-sm text-muted-foreground tracking-wide">
            {mode === "login" && "Keikaku — Planlama"}
            {mode === "signup" && "Yeni Hesap"}
            {mode === "forgot" && "Şifre Sıfırlama"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-3">
            {mode === "signup" && (
              <Input
                type="text"
                placeholder="Ad Soyad"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="bg-transparent border-border/60 focus:border-foreground/30 h-11"
              />
            )}
            <Input
              type="email"
              placeholder="E-posta"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent border-border/60 focus:border-foreground/30 h-11"
            />
            {mode !== "forgot" && (
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Şifre"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="bg-transparent border-border/60 focus:border-foreground/30 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            )}
            {mode === "signup" && (
              <div className="relative">
                <Input
                  type={showPasswordConfirm ? "text" : "password"}
                  placeholder="Şifre (tekrar)"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  required
                  minLength={6}
                  className="bg-transparent border-border/60 focus:border-foreground/30 h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPasswordConfirm ? "Şifreyi gizle" : "Şifreyi göster"}
                >
                  {showPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                {passwordConfirm.length > 0 && password !== passwordConfirm && (
                  <p className="mt-1 text-xs text-destructive tracking-wide">
                    Şifreler uyuşmuyor
                  </p>
                )}
              </div>
            )}
          </div>

          {mode === "login" && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors tracking-wide"
              >
                Şifreni mi unuttun?
              </button>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 tracking-wider font-light"
          >
            {loading
              ? "..."
              : mode === "login"
                ? "Giriş Yap"
                : mode === "signup"
                  ? "Kayıt Ol"
                  : "Sıfırlama Bağlantısı Gönder"}
          </Button>
        </form>

        <div className="text-center space-y-2">
          {mode === "login" && (
            <button
              onClick={() => switchMode("signup")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors tracking-wide"
            >
              Hesabınız yok mu? Kayıt olun
            </button>
          )}
          {mode === "signup" && (
            <button
              onClick={() => switchMode("login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors tracking-wide"
            >
              Zaten hesabınız var mı? Giriş yapın
            </button>
          )}
          {mode === "forgot" && (
            <button
              onClick={() => switchMode("login")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors tracking-wide"
            >
              Girişe dön
            </button>
          )}
        </div>

        <div className="text-center pt-8">
          <span className="text-xs text-muted-foreground/50 tracking-widest">和紙</span>
        </div>
      </div>
    </div>
  );
};

export default Auth;
