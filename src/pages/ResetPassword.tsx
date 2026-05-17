import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase processes the recovery token from URL hash automatically.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Hata", description: "Şifre en az 6 karakter olmalı.", variant: "destructive" });
      return;
    }
    if (password !== passwordConfirm) {
      toast({ title: "Hata", description: "Şifreler uyuşmuyor.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast({ title: "完了", description: "Şifreniz güncellendi." });
      await supabase.auth.signOut();
      navigate("/auth", { replace: true });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10" style={{ backgroundColor: 'hsl(40, 23%, 97%)' }}>
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl tracking-widest text-foreground">計画</h1>
          <p className="text-sm text-muted-foreground tracking-wide">Yeni Şifre Belirle</p>
        </div>

        {!ready ? (
          <p className="text-center text-sm text-muted-foreground tracking-wide">
            Bağlantı doğrulanıyor...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Yeni şifre"
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
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Yeni şifre (tekrar)"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
              className="bg-transparent border-border/60 focus:border-foreground/30 h-11"
            />
            {passwordConfirm.length > 0 && password !== passwordConfirm && (
              <p className="text-xs text-destructive tracking-wide">Şifreler uyuşmuyor</p>
            )}
            <Button type="submit" disabled={loading} className="w-full h-11 tracking-wider font-light">
              {loading ? "..." : "Şifreyi Güncelle"}
            </Button>
          </form>
        )}

        <div className="text-center pt-8">
          <span className="text-xs text-muted-foreground/50 tracking-widest">和紙</span>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
