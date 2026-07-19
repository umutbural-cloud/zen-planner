import { beforeEach, describe, expect, it, vi } from "vitest";
import { runPwaUpdateNow } from "./pwaUpdateCoordinator";

type Listener = () => void;

const createNavigator = () => {
  const listeners = new Map<string, Listener>();
  const serviceWorker = {
    addEventListener: vi.fn((name: string, handler: Listener) => {
      listeners.set(name, handler);
    }),
    removeEventListener: vi.fn((name: string, handler: Listener) => {
      if (listeners.get(name) === handler) listeners.delete(name);
    }),
  };

  Object.defineProperty(globalThis.navigator, "serviceWorker", {
    configurable: true,
    value: serviceWorker,
  });

  return {
    serviceWorker,
    dispatchControllerChange: () => listeners.get("controllerchange")?.(),
  };
};

const makeDeps = (overrides: Partial<Parameters<typeof runPwaUpdateNow>[0]> = {}) => {
  const state = {
    status: "idle" as const,
    needRefresh: false,
    inProgress: false,
    updateCalls: 0,
    reloadCalls: 0,
  };

  return {
    state,
    deps: {
      updateServiceWorker: async () => {
        state.updateCalls += 1;
      },
      setStatus: (status: typeof state.status) => {
        state.status = status;
      },
      setNeedRefresh: (value: boolean) => {
        state.needRefresh = value;
      },
      clearNeedRefreshRef: () => {
        state.needRefresh = false;
      },
      isUpdateInProgress: () => state.inProgress,
      setUpdateInProgress: (value: boolean) => {
        state.inProgress = value;
      },
      onReload: () => {
        state.reloadCalls += 1;
      },
      ...overrides,
    },
  };
};

describe("runPwaUpdateNow", () => {
  beforeEach(() => {
    vi.useRealTimers();
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
  });

  it("installs controllerchange before update and reloads once", async () => {
    const { serviceWorker, dispatchControllerChange } = createNavigator();
    const { state, deps } = makeDeps();

    const promise = runPwaUpdateNow(deps);
    expect(serviceWorker.addEventListener).toHaveBeenCalledWith("controllerchange", expect.any(Function));
    expect(state.updateCalls).toBe(1);

    dispatchControllerChange();
    dispatchControllerChange();
    await promise;
    expect(state.reloadCalls).toBe(1);
    expect(state.status).toBe("up-to-date");
  });

  it("ignores a second update while one is in flight", async () => {
    const { dispatchControllerChange } = createNavigator();
    let resolveUpdate!: () => void;
    const updateServiceWorker = vi.fn(() => new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    }));
    const { state, deps } = makeDeps({
      updateServiceWorker,
    });

    const first = runPwaUpdateNow(deps);
    const second = runPwaUpdateNow(deps);

    await second;
    expect(state.inProgress).toBe(true);
    expect(state.reloadCalls).toBe(0);
    expect(state.status).toBe("checking");
    expect(updateServiceWorker).toHaveBeenCalledTimes(1);
    expect(globalThis.navigator.serviceWorker.addEventListener).toHaveBeenCalledWith("controllerchange", expect.any(Function));
    dispatchControllerChange();
    resolveUpdate();
    await first;
  });

  it("sets error when updateServiceWorker rejects", async () => {
    createNavigator();
    const { state, deps } = makeDeps({
      updateServiceWorker: async () => {
        throw new Error("boom");
      },
    });

    await runPwaUpdateNow(deps);
    expect(state.status).toBe("error");
    expect(state.reloadCalls).toBe(0);
  });

  it("fails when controllerchange never arrives", async () => {
    vi.useFakeTimers();
    createNavigator();
    const { state, deps } = makeDeps();

    const promise = runPwaUpdateNow(deps);
    await vi.advanceTimersByTimeAsync(15000);
    await promise;

    expect(state.status).toBe("error");
  });

  it("marks unsupported when service workers are unavailable", async () => {
    const { state, deps } = makeDeps();
    delete (globalThis.navigator as Navigator & { serviceWorker?: unknown }).serviceWorker;

    await runPwaUpdateNow(deps);
    expect(state.status).toBe("unsupported");
  });
});
