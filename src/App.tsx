import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useRef } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { UndoProvider } from "@/hooks/useUndo";
import { PomodoroProvider } from "@/hooks/usePomodoro";
import { PageStateProvider } from "@/hooks/usePageState";
import { PrayerTimesSync } from "@/components/PrayerTimesSync";
import { UiScaleSync } from "@/components/UiScaleSync";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AccountGateScreen } from "@/components/account-gate/AccountGateScreen";
import { useAccountGate } from "@/hooks/useAccountGate";
import AppShell from "@/components/AppShell";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Pomodoro from "./pages/Pomodoro";
import WorkHistory from "./pages/WorkHistory";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, initialAuthResolved } = useAuth();
  const { status, gate, error, refreshGate, signOut } = useAccountGate();
  const allowedUserIdRef = useRef<string | null>(null);
  const currentUserId = user?.id ?? null;
  const hasVerifiedShell = !!currentUserId && allowedUserIdRef.current === currentUserId;

  if (!initialAuthResolved || (status === "loading" && !hasVerifiedShell)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm tracking-widest">読み込み中...</span>
      </div>
    );
  }
  if (!user || status === "signed_out") {
    allowedUserIdRef.current = null;
    return <Navigate to="/auth" replace />;
  }
  if (status === "loading" && hasVerifiedShell) return <>{children}</>;
  if (status === "allowed") {
    allowedUserIdRef.current = user.id;
    return <>{children}</>;
  }
  allowedUserIdRef.current = null;
  return (
    <AccountGateScreen
      status={status}
      gate={gate}
      error={error}
      onRetry={refreshGate}
      onSignOut={signOut}
    />
  );
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, initialAuthResolved } = useAuth();
  if (!initialAuthResolved) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-muted-foreground text-sm tracking-widest">読み込み中...</span>
      </div>
    );
  }
  return user ? <Navigate to="/" replace /> : <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ErrorBoundary>
          <UndoProvider>
            <PomodoroProvider>
              <PageStateProvider>
              <PrayerTimesSync />
              <UiScaleSync />
              <Routes>
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
                  <Route path="/" element={<Index />} />
                  <Route path="/pomodoro" element={<Pomodoro />} />
                  <Route path="/work-history" element={<WorkHistory />} />
                </Route>
                <Route path="/admin" element={<Admin />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              </PageStateProvider>
            </PomodoroProvider>
          </UndoProvider>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
