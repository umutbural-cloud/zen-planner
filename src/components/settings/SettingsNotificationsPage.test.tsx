import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  usePushNotifications: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastWarning: vi.fn(),
}));

vi.mock("@/hooks/usePushNotifications", () => ({ usePushNotifications: mocks.usePushNotifications }));
vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
    warning: mocks.toastWarning,
  },
}));

import { SettingsNotificationsPage } from "./SettingsNotificationsPage";

const hookValue = (overrides: Record<string, unknown> = {}) => ({
  status: "permission-default",
  permission: "default",
  activeOperation: null,
  isSendingTest: false,
  error: null,
  refresh: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockResolvedValue(true),
  unsubscribe: vi.fn().mockResolvedValue({ browserUnsubscribed: true, serverRowDeleted: true, errors: [] }),
  testPush: vi.fn().mockResolvedValue({ subscriptions_found: 1, sent: 1, expired_removed: 0, failed: 0 }),
  ...overrides,
});

describe("SettingsNotificationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.usePushNotifications.mockReturnValue(hookValue());
  });

  it.each([
    ["loading", "Bildirim durumu kontrol ediliyor"],
    ["unsupported", "Bu cihazda Web Push desteklenmiyor"],
    ["ios-not-installed", "Ana ekrana eklenmeli"],
    ["permission-default", "Bildirimler kapalı"],
    ["permission-denied", "Bildirim izni tarayıcı veya cihaz ayarlarından engellenmiş"],
    ["granted-not-subscribed", "İzin var, cihaz bağlı değil"],
    ["subscribed", "Bu cihaz bağlı"],
    ["error", "Bildirim durumu şu anda doğrulanamadı"],
  ])("renders the %s state", (status, text) => {
    mocks.usePushNotifications.mockReturnValue(hookValue({ status }));
    render(<SettingsNotificationsPage />);
    expect(screen.getByText(new RegExp(text))).toBeInTheDocument();
  });

  it("does not request permission or subscribe on render", () => {
    const requestPermission = vi.fn();
    vi.stubGlobal("Notification", { requestPermission });
    const value = hookValue();
    mocks.usePushNotifications.mockReturnValue(value);
    render(<SettingsNotificationsPage />);
    expect(requestPermission).not.toHaveBeenCalled();
    expect(value.subscribe).not.toHaveBeenCalled();
  });

  it("starts subscription from the explicit button", async () => {
    const value = hookValue();
    mocks.usePushNotifications.mockReturnValue(value);
    render(<SettingsNotificationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Bildirimleri aç" }));
    await waitFor(() => expect(value.subscribe).toHaveBeenCalledTimes(1));
  });

  it("runs test push and current-device unsubscribe actions", async () => {
    const value = hookValue({ status: "subscribed" });
    mocks.usePushNotifications.mockReturnValue(value);
    render(<SettingsNotificationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Test bildirimi gönder" }));
    await waitFor(() => expect(value.testPush).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Bu cihazda kapat" }));
    await waitFor(() => expect(value.unsubscribe).toHaveBeenCalledTimes(1));
  });

  it("reports partial unsubscribe instead of full success", async () => {
    const value = hookValue({
      status: "subscribed",
      unsubscribe: vi.fn().mockResolvedValue({ browserUnsubscribed: true, serverRowDeleted: false, errors: [new Error("partial")] }),
    });
    mocks.usePushNotifications.mockReturnValue(value);
    render(<SettingsNotificationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Bu cihazda kapat" }));
    await waitFor(() => expect(mocks.toastWarning).toHaveBeenCalledWith("Tarayıcı aboneliği kapatıldı ancak sunucu kaydı tamamen temizlenemedi."));
    expect(mocks.toastSuccess).not.toHaveBeenCalledWith("Bu cihazda bildirimler kapatıldı.");
  });

  it("reports partial test-push delivery honestly", async () => {
    const value = hookValue({
      status: "subscribed",
      testPush: vi.fn().mockResolvedValue({ subscriptions_found: 2, sent: 1, expired_removed: 0, failed: 1 }),
    });
    mocks.usePushNotifications.mockReturnValue(value);
    render(<SettingsNotificationsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Test bildirimi gönder" }));
    await waitFor(() => expect(mocks.toastWarning).toHaveBeenCalledWith("Bildirim bazı cihazlara gönderildi, bazı cihazlarda başarısız oldu."));
  });

  it("disables actions while an operation is active", () => {
    mocks.usePushNotifications.mockReturnValue(hookValue({ status: "subscribed", activeOperation: "test-push", isSendingTest: true }));
    render(<SettingsNotificationsPage />);
    expect(screen.getByRole("button", { name: "Gönderiliyor" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bu cihazda kapat" })).toBeDisabled();
  });

  it("keeps scheduler content informational and uses mobile-safe wrappers", () => {
    const { container } = render(<SettingsNotificationsPage />);
    expect(screen.getByText("Zamanlanmış bildirimler")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /kaydet/i })).not.toBeInTheDocument();
    expect(container.querySelector(".min-w-0")).toBeInTheDocument();
    expect(container.querySelector(".pb-24")).toBeInTheDocument();
  });
});
