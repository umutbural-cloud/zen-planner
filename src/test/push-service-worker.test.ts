import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it, vi } from "vitest";

type WorkerHandler = (event: Record<string, unknown>) => void;

const source = readFileSync(resolve(process.cwd(), "public/push-service-worker.js"), "utf8");

const createWorker = () => {
  const handlers = new Map<string, WorkerHandler>();
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const matchAll = vi.fn().mockResolvedValue([]);
  const openWindow = vi.fn().mockResolvedValue(undefined);
  const workerSelf = {
    location: { origin: "https://zen.test" },
    registration: { showNotification },
    clients: { matchAll, openWindow },
    addEventListener: (name: string, handler: WorkerHandler) => handlers.set(name, handler),
  };
  vm.runInNewContext(source, { self: workerSelf, URL, Promise });
  return { handlers, showNotification, matchAll, openWindow };
};

const dispatchPush = async (
  handler: WorkerHandler,
  payload?: unknown,
  malformed = false,
) => {
  let pending = Promise.resolve();
  handler({
    data: payload === undefined ? undefined : {
      json: () => {
        if (malformed) throw new Error("bad json");
        return payload;
      },
    },
    waitUntil: (promise: Promise<void>) => { pending = promise; },
  });
  await pending;
};

describe("push service worker", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [undefined, false],
    [{}, false],
    ["malformed", true],
  ])("uses safe fallbacks for missing or malformed payloads", async (payload, malformed) => {
    const worker = createWorker();
    await dispatchPush(worker.handlers.get("push")!, payload, malformed);
    expect(worker.showNotification).toHaveBeenCalledWith("Zen Planner", {
      body: "Yeni bir bildiriminiz var.",
      icon: "/icons/icon-192.png",
      tag: "zen-planner-notification",
      data: { type: "generic", url: "/" },
    });
  });

  it.each([
    ["https://outside.test/path", "/"],
    ["javascript:alert(1)", "/"],
    ["/tasks?view=today#top", "/tasks?view=today#top"],
  ])("normalizes notification URL %s to %s", async (url, expected) => {
    const worker = createWorker();
    await dispatchPush(worker.handlers.get("push")!, {
      type: "test",
      title: "Title",
      body: "Body",
      url,
      tag: "tag",
    });
    expect(worker.showNotification).toHaveBeenCalledWith("Title", expect.objectContaining({
      data: { type: "test", url: expected },
    }));
  });

  it("closes and focuses an exact target client", async () => {
    const worker = createWorker();
    const focus = vi.fn().mockResolvedValue(undefined);
    worker.matchAll.mockResolvedValue([{ url: "https://zen.test/tasks", focus }]);
    const close = vi.fn();
    let pending = Promise.resolve();
    worker.handlers.get("notificationclick")!({
      notification: { close, data: { url: "/tasks" } },
      waitUntil: (promise: Promise<void>) => { pending = promise; },
    });
    await pending;
    expect(close).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    expect(worker.openWindow).not.toHaveBeenCalled();
  });

  it("navigates and focuses an existing same-origin client", async () => {
    const worker = createWorker();
    const navigate = vi.fn().mockResolvedValue(undefined);
    const focus = vi.fn().mockResolvedValue(undefined);
    worker.matchAll.mockResolvedValue([{ url: "https://zen.test/", navigate, focus }]);
    let pending = Promise.resolve();
    worker.handlers.get("notificationclick")!({
      notification: { close: vi.fn(), data: { url: "/tasks" } },
      waitUntil: (promise: Promise<void>) => { pending = promise; },
    });
    await pending;
    expect(navigate).toHaveBeenCalledWith("https://zen.test/tasks");
    expect(focus).toHaveBeenCalled();
  });

  it("opens a safe fallback window and never opens an external URL", async () => {
    const worker = createWorker();
    let pending = Promise.resolve();
    worker.handlers.get("notificationclick")!({
      notification: { close: vi.fn(), data: { url: "https://outside.test/secret" } },
      waitUntil: (promise: Promise<void>) => { pending = promise; },
    });
    await pending;
    expect(worker.openWindow).toHaveBeenCalledWith("https://zen.test/");
    expect(worker.openWindow).not.toHaveBeenCalledWith(expect.stringContaining("outside.test"));
  });
});
