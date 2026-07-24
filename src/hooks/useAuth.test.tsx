import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cleanup: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  authSubscriptionUnsubscribe: vi.fn(),
}));

vi.mock("@/services/pushNotifications", () => ({
  cleanupCurrentUserPushBeforeSignOut: mocks.cleanup,
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      signOut: mocks.signOut,
      getSession: mocks.getSession,
      refreshSession: mocks.refreshSession,
      onAuthStateChange: mocks.onAuthStateChange,
    },
  },
}));

import { AuthProvider, useAuth } from "./useAuth";

const session = { user: { id: "current-user" } };

const Consumer = () => {
  const { user, signOut } = useAuth();
  return <button type="button" disabled={!user} onClick={() => void signOut()}>Çıkış yap</button>;
};

describe("AuthProvider push cleanup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSession.mockResolvedValue({ data: { session } });
    mocks.refreshSession.mockResolvedValue({ data: { session }, error: null });
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mocks.authSubscriptionUnsubscribe } } });
    mocks.cleanup.mockResolvedValue({ status: "completed", result: { browserUnsubscribed: true, serverRowDeleted: true, errors: [] } });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  const renderAndSignOut = async () => {
    render(<AuthProvider><Consumer /></AuthProvider>);
    const button = await screen.findByRole("button", { name: "Çıkış yap" });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledTimes(1));
  };

  it("runs current-user cleanup once before signing out", async () => {
    await renderAndSignOut();
    expect(mocks.cleanup).toHaveBeenCalledTimes(1);
    expect(mocks.cleanup).toHaveBeenCalledWith("current-user");
    expect(mocks.cleanup.mock.invocationCallOrder[0]).toBeLessThan(mocks.signOut.mock.invocationCallOrder[0]);
  });

  it.each([
    { status: "skipped", reason: "no-browser-subscription" },
    { status: "failed", reason: "timeout" },
  ])("continues sign-out after cleanup result $status", async (result) => {
    mocks.cleanup.mockResolvedValue(result);
    await renderAndSignOut();
    expect(mocks.cleanup).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("continues sign-out when cleanup rejects", async () => {
    mocks.cleanup.mockRejectedValue(new Error("private cleanup detail"));
    await renderAndSignOut();
    expect(mocks.cleanup).toHaveBeenCalledTimes(1);
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });
});
