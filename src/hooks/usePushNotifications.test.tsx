import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PushSnapshot } from "@/services/pushNotifications";

const mocks = vi.hoisted(() => ({
  readPushSnapshot: vi.fn(),
  subscribeCurrentDevice: vi.fn(),
  disconnectCurrentDevice: vi.fn(),
  sendTestPushNotification: vi.fn(),
  normalizePushError: vi.fn((error: unknown) => error instanceof Error ? error : new Error("normalized")),
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/services/pushNotifications", () => ({
  readPushSnapshot: mocks.readPushSnapshot,
  subscribeCurrentDevice: mocks.subscribeCurrentDevice,
  disconnectCurrentDevice: mocks.disconnectCurrentDevice,
  sendTestPushNotification: mocks.sendTestPushNotification,
  normalizePushError: mocks.normalizePushError,
}));

import { usePushNotifications } from "./usePushNotifications";

const snapshot = (overrides: Partial<PushSnapshot> = {}): PushSnapshot => ({
  support: { status: "supported", reason: null },
  permission: "default",
  browserSubscription: null,
  ownedSubscription: null,
  ...overrides,
});

const subscribedSnapshot = snapshot({
  permission: "granted",
  browserSubscription: {} as PushSubscription,
  ownedSubscription: { id: "row-id", endpoint: "https://push.example/subscription" },
});

describe("usePushNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: { id: "user-id" } });
    mocks.readPushSnapshot.mockResolvedValue(snapshot());
    mocks.subscribeCurrentDevice.mockResolvedValue({ id: "id", subscription: {} });
    mocks.disconnectCurrentDevice.mockResolvedValue({ browserUnsubscribed: true, serverRowDeleted: true, errors: [] });
    mocks.sendTestPushNotification.mockResolvedValue({ subscriptions_found: 1, sent: 1, expired_removed: 0, failed: 0 });
  });

  it("reads only a snapshot on mount", async () => {
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("permission-default"));
    expect(mocks.readPushSnapshot).toHaveBeenCalledWith("user-id");
    expect(mocks.subscribeCurrentDevice).not.toHaveBeenCalled();
    expect(mocks.sendTestPushNotification).not.toHaveBeenCalled();
  });

  it.each([
    [snapshot({ support: { status: "unsupported", reason: "push-api-unavailable" }, permission: "unsupported" }), "unsupported"],
    [snapshot({ support: { status: "ios-not-installed", reason: "home-screen-required" }, permission: "unsupported" }), "ios-not-installed"],
    [snapshot({ permission: "denied" }), "permission-denied"],
    [snapshot({ permission: "granted" }), "granted-not-subscribed"],
    [subscribedSnapshot, "subscribed"],
  ] as const)("derives the expected state", async (nextSnapshot, expected) => {
    mocks.readPushSnapshot.mockResolvedValue(nextSnapshot);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe(expected));
  });

  it("subscribes from an explicit action and refreshes", async () => {
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("permission-default"));
    mocks.readPushSnapshot.mockResolvedValue(subscribedSnapshot);
    await act(async () => expect(await result.current.subscribe()).toBe(true));
    expect(mocks.subscribeCurrentDevice).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("subscribed");
  });

  it("surfaces a controlled subscribe error", async () => {
    mocks.subscribeCurrentDevice.mockRejectedValue(new Error("controlled"));
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("permission-default"));
    await act(async () => expect(await result.current.subscribe()).toBe(false));
    expect(result.current.status).toBe("error");
    expect(result.current.error?.message).toBe("controlled");
  });

  it.each([
    { browserUnsubscribed: true, serverRowDeleted: true, errors: [] },
    { browserUnsubscribed: true, serverRowDeleted: false, errors: [new Error("partial")] },
    { browserUnsubscribed: false, serverRowDeleted: true, errors: [new Error("partial")] },
  ])("preserves unsubscribe results and refreshes", async (disconnectResult) => {
    mocks.disconnectCurrentDevice.mockResolvedValue(disconnectResult);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("permission-default"));
    await act(async () => expect(await result.current.unsubscribe()).toEqual(disconnectResult));
    expect(result.current.disconnectResult).toBe(disconnectResult);
    expect(mocks.readPushSnapshot).toHaveBeenCalledTimes(2);
  });

  it("sends a test push only while subscribed", async () => {
    mocks.readPushSnapshot.mockResolvedValue(subscribedSnapshot);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("subscribed"));
    await act(async () => expect(await result.current.testPush()).toEqual({ subscriptions_found: 1, sent: 1, expired_removed: 0, failed: 0 }));
    expect(mocks.sendTestPushNotification).toHaveBeenCalledTimes(1);
  });

  it("refreshes after an expired-only test result", async () => {
    mocks.readPushSnapshot.mockResolvedValue(subscribedSnapshot);
    mocks.sendTestPushNotification.mockResolvedValue({ subscriptions_found: 1, sent: 0, expired_removed: 1, failed: 0 });
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("subscribed"));
    await act(async () => void await result.current.testPush());
    expect(mocks.readPushSnapshot).toHaveBeenCalledTimes(2);
  });

  it("preserves a partial test-push aggregate", async () => {
    const partial = { subscriptions_found: 2, sent: 1, expired_removed: 0, failed: 1 };
    mocks.readPushSnapshot.mockResolvedValue(subscribedSnapshot);
    mocks.sendTestPushNotification.mockResolvedValue(partial);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("subscribed"));
    await act(async () => expect(await result.current.testPush()).toEqual(partial));
    expect(result.current.testResult).toEqual(partial);
  });

  it("normalizes test-push errors", async () => {
    mocks.readPushSnapshot.mockResolvedValue(subscribedSnapshot);
    mocks.sendTestPushNotification.mockRejectedValue(new Error("test failed"));
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("subscribed"));
    await act(async () => expect(await result.current.testPush()).toBeNull());
    expect(result.current.error?.message).toBe("test failed");
  });

  it("prevents concurrent operations", async () => {
    let resolveSubscribe: () => void = () => {};
    mocks.subscribeCurrentDevice.mockReturnValue(new Promise<void>((resolve) => { resolveSubscribe = resolve; }));
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("permission-default"));
    let first: Promise<boolean>;
    act(() => { first = result.current.subscribe(); });
    await waitFor(() => expect(result.current.activeOperation).toBe("subscribe"));
    await act(async () => expect(await result.current.subscribe()).toBe(false));
    expect(mocks.subscribeCurrentDevice).toHaveBeenCalledTimes(1);
    await act(async () => { resolveSubscribe(); await first!; });
  });

  it("ignores an async result after unmount", async () => {
    let resolveRead: (value: PushSnapshot) => void = () => {};
    mocks.readPushSnapshot.mockImplementation(() => new Promise<PushSnapshot>((resolve) => { resolveRead = resolve; }));
    const { unmount } = renderHook(() => usePushNotifications());
    unmount();
    await act(async () => resolveRead(snapshot({ permission: "granted" })));
    expect(mocks.normalizePushError).not.toHaveBeenCalled();
  });
});
