import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PushSnapshot } from "@/services/pushNotifications";

const mocks = vi.hoisted(() => ({
  readPushSnapshot: vi.fn(),
  subscribeCurrentDevice: vi.fn(),
  disconnectCurrentDevice: vi.fn(),
  normalizePushError: vi.fn((error: unknown) => error instanceof Error ? error : new Error("normalized")),
  useAuth: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: mocks.useAuth }));
vi.mock("@/services/pushNotifications", () => ({
  readPushSnapshot: mocks.readPushSnapshot,
  subscribeCurrentDevice: mocks.subscribeCurrentDevice,
  disconnectCurrentDevice: mocks.disconnectCurrentDevice,
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

describe("usePushNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuth.mockReturnValue({ user: { id: "user-id" } });
    mocks.readPushSnapshot.mockResolvedValue(snapshot());
    mocks.subscribeCurrentDevice.mockResolvedValue({ id: "id", subscription: {} });
    mocks.disconnectCurrentDevice.mockResolvedValue({
      browserUnsubscribed: true,
      serverRowDeleted: true,
      errors: [],
    });
  });

  it("reads state on mount without requesting permission, subscribing, or claiming", async () => {
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("permission-default"));
    expect(mocks.readPushSnapshot).toHaveBeenCalledWith("user-id");
    expect(mocks.subscribeCurrentDevice).not.toHaveBeenCalled();
  });

  it.each([
    [snapshot({ support: { status: "unsupported", reason: "push-api-unavailable" }, permission: "unsupported" }), "unsupported"],
    [snapshot({ support: { status: "ios-not-installed", reason: "home-screen-required" }, permission: "unsupported" }), "ios-not-installed"],
    [snapshot({ permission: "denied" }), "permission-denied"],
    [snapshot({ permission: "granted" }), "granted-not-subscribed"],
  ] as const)("derives %s as %s", async (nextSnapshot, expected) => {
    mocks.readPushSnapshot.mockResolvedValue(nextSnapshot);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe(expected));
  });

  it("reports subscribed only when browser and owned records both exist", async () => {
    mocks.readPushSnapshot.mockResolvedValue(snapshot({
      permission: "granted",
      browserSubscription: {} as PushSubscription,
      ownedSubscription: { id: "row-id", endpoint: "https://push.example/subscription" },
    }));
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("subscribed"));
    expect(result.current.hasBrowserSubscription).toBe(true);
    expect(result.current.hasOwnedSubscription).toBe(true);
  });

  it("subscribes only from an explicit hook action and refreshes", async () => {
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("permission-default"));
    mocks.readPushSnapshot.mockResolvedValue(snapshot({ permission: "granted" }));
    await act(async () => result.current.subscribe());
    expect(mocks.subscribeCurrentDevice).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("granted-not-subscribed");
  });

  it("returns and preserves a partial disconnect result before refresh", async () => {
    const partial = {
      browserUnsubscribed: true,
      serverRowDeleted: false,
      errors: [new Error("partial")],
    };
    mocks.disconnectCurrentDevice.mockResolvedValue(partial);
    const { result } = renderHook(() => usePushNotifications());
    await waitFor(() => expect(result.current.status).toBe("permission-default"));
    await act(async () => result.current.unsubscribe());
    expect(result.current.disconnectResult).toBe(partial);
    expect(mocks.readPushSnapshot).toHaveBeenCalledTimes(2);
  });

  it("does not let a stale refresh overwrite a newer result", async () => {
    let resolveFirst: (value: PushSnapshot) => void = () => {};
    mocks.readPushSnapshot.mockImplementationOnce(() => new Promise<PushSnapshot>((resolve) => {
      resolveFirst = resolve;
    })).mockResolvedValueOnce(snapshot({ permission: "denied" }));
    const { result } = renderHook(() => usePushNotifications());
    await act(async () => result.current.refresh());
    await waitFor(() => expect(result.current.status).toBe("permission-denied"));
    await act(async () => resolveFirst(snapshot({ permission: "granted" })));
    expect(result.current.status).toBe("permission-denied");
  });

  it("ignores an async result after unmount", async () => {
    let resolveRead: (value: PushSnapshot) => void = () => {};
    mocks.readPushSnapshot.mockImplementation(() => new Promise<PushSnapshot>((resolve) => {
      resolveRead = resolve;
    }));
    const { unmount } = renderHook(() => usePushNotifications());
    unmount();
    await act(async () => resolveRead(snapshot({ permission: "granted" })));
    expect(mocks.normalizePushError).not.toHaveBeenCalled();
  });
});
