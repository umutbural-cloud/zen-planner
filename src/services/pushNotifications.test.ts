import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
  deleteEq: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: mocks.rpc,
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: mocks.maybeSingle })),
      })),
      delete: vi.fn(() => ({ eq: mocks.deleteEq })),
    })),
  },
}));

import {
  disconnectCurrentDevice,
  getPushSupport,
  normalizePushError,
  readPushSnapshot,
  subscribeCurrentDevice,
  urlBase64ToUint8Array,
} from "./pushNotifications";

const VAPID_PUBLIC_KEY = "BBVWbQGrqiFT9joks6Wb_Vg2Vq3JVG4dJeknXNSoSQzByuDJkKpKxN72-uCYFnTcSzfU-6iqfTSo-Z19ld2pjlk";

const makeSubscription = ({
  unsubscribe = vi.fn().mockResolvedValue(true),
  keys = { p256dh: "p256dh-key", auth: "auth-key" },
} = {}) => ({
  endpoint: "https://push.example/subscription",
  toJSON: () => ({ endpoint: "https://push.example/subscription", keys }),
  unsubscribe,
}) as unknown as PushSubscription;

const installBrowserSupport = (subscription: PushSubscription | null = null) => {
  class TestServiceWorkerRegistration {}
  Object.defineProperty(TestServiceWorkerRegistration.prototype, "pushManager", { value: {} });
  vi.stubGlobal("ServiceWorkerRegistration", TestServiceWorkerRegistration);
  vi.stubGlobal("PushManager", class TestPushManager {});
  vi.stubGlobal("Notification", {
    permission: "granted",
    requestPermission: vi.fn().mockResolvedValue("granted"),
  });
  Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      ready: Promise.resolve({
        pushManager: {
          getSubscription: vi.fn().mockResolvedValue(subscription),
          subscribe: vi.fn().mockResolvedValue(subscription ?? makeSubscription()),
        },
      }),
    },
  });
  Object.defineProperty(navigator, "standalone", { configurable: true, value: undefined });
  vi.stubEnv("VITE_VAPID_PUBLIC_KEY", VAPID_PUBLIC_KEY);
};

describe("pushNotifications service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    installBrowserSupport();
    mocks.rpc.mockResolvedValue({ data: "subscription-id", error: null });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    mocks.deleteEq.mockResolvedValue({ error: null });
  });

  it("converts a valid padded base64url VAPID key", () => {
    const converted = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
    expect(converted).toHaveLength(65);
    expect(converted[0]).toBe(4);
  });

  it.each(["", "not valid!", "AQAB"])("rejects an invalid VAPID key: %s", (value) => {
    expect(() => urlBase64ToUint8Array(value)).toThrow("Bildirim yapılandırması geçersiz");
  });

  it("detects insecure and missing-key configurations", () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
    expect(getPushSupport(VAPID_PUBLIC_KEY)).toEqual({ status: "unsupported", reason: "secure-context-required" });
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    expect(getPushSupport("")).toEqual({ status: "misconfigured", reason: "missing-or-invalid-vapid-key" });
  });

  it("detects an iOS-like browser that is not installed", () => {
    vi.unstubAllGlobals();
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "standalone", { configurable: true, value: false });
    expect(getPushSupport(VAPID_PUBLIC_KEY)).toEqual({ status: "ios-not-installed", reason: "home-screen-required" });
  });

  it("does not automatically claim an existing unowned browser subscription", async () => {
    const subscription = makeSubscription();
    installBrowserSupport(subscription);
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    const snapshot = await readPushSnapshot("user-id");
    expect(snapshot.browserSubscription).toBe(subscription);
    expect(snapshot.ownedSubscription).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reuses an existing subscription and calls the canonical claim RPC with exact args", async () => {
    const subscription = makeSubscription();
    installBrowserSupport(subscription);
    await subscribeCurrentDevice();
    expect(mocks.rpc).toHaveBeenCalledWith("claim_push_subscription", {
      p_endpoint: "https://push.example/subscription",
      p_p256dh: "p256dh-key",
      p_auth: "auth-key",
      p_device_label: "Browser",
      p_user_agent: navigator.userAgent,
    });
  });

  it("rejects subscriptions with missing browser keys before claim", async () => {
    installBrowserSupport(makeSubscription({ keys: { p256dh: "", auth: "" } }));
    await expect(subscribeCurrentDevice()).rejects.toThrow("geçerli bir bildirim aboneliği");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not subscribe when permission is denied", async () => {
    installBrowserSupport();
    vi.stubGlobal("Notification", {
      permission: "denied",
      requestPermission: vi.fn(),
    });
    await expect(subscribeCurrentDevice()).rejects.toThrow("Bildirim izni verilmedi");
    expect(Notification.requestPermission).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("disconnects the browser and deletes only the captured endpoint", async () => {
    const unsubscribe = vi.fn().mockResolvedValue(true);
    installBrowserSupport(makeSubscription({ unsubscribe }));
    const result = await disconnectCurrentDevice();
    expect(result).toEqual({ browserUnsubscribed: true, serverRowDeleted: true, errors: [] });
    expect(mocks.deleteEq).toHaveBeenCalledWith("endpoint", "https://push.example/subscription");
  });

  it("returns partial success when browser succeeds and server fails", async () => {
    installBrowserSupport(makeSubscription());
    mocks.deleteEq.mockResolvedValue({ error: new Error("server") });
    const result = await disconnectCurrentDevice();
    expect(result.browserUnsubscribed).toBe(true);
    expect(result.serverRowDeleted).toBe(false);
    expect(result.errors[0]?.message).toBe("Sunucu abonelik kaydı temizlenemedi.");
  });

  it("returns partial success when server succeeds and browser fails", async () => {
    installBrowserSupport(makeSubscription({ unsubscribe: vi.fn().mockRejectedValue(new Error("browser")) }));
    const result = await disconnectCurrentDevice();
    expect(result.browserUnsubscribed).toBe(false);
    expect(result.serverRowDeleted).toBe(true);
    expect(result.errors[0]?.message).toBe("Tarayıcı aboneliği kapatılamadı.");
  });

  it("reports both failures without exposing raw errors", async () => {
    installBrowserSupport(makeSubscription({ unsubscribe: vi.fn().mockRejectedValue(new Error("endpoint secret")) }));
    mocks.deleteEq.mockRejectedValue(new Error("database detail"));
    const result = await disconnectCurrentDevice();
    expect(result.browserUnsubscribed).toBe(false);
    expect(result.serverRowDeleted).toBe(false);
    expect(result.errors.map((error) => error.message)).toEqual([
      "Tarayıcı aboneliği kapatılamadı.",
      "Sunucu abonelik kaydı temizlenemedi.",
    ]);
    expect(normalizePushError(new Error("sensitive"))).toHaveProperty(
      "message",
      "Bildirim işlemi tamamlanamadı. Lütfen tekrar deneyin.",
    );
  });
});
