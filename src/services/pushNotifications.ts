import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type PushSupportStatus = "supported" | "unsupported" | "ios-not-installed" | "misconfigured";

export type PushSupportResult = {
  status: PushSupportStatus;
  reason: string | null;
};

export type PushSnapshot = {
  support: PushSupportResult;
  permission: NotificationPermission | "unsupported";
  browserSubscription: PushSubscription | null;
  ownedSubscription: Pick<Database["public"]["Tables"]["push_subscriptions"]["Row"], "id" | "endpoint"> | null;
};

export type DisconnectPushResult = {
  browserUnsubscribed: boolean;
  serverRowDeleted: boolean;
  errors: Error[];
};

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export class PushNotificationError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PushNotificationError";
  }
}

const controlledError = (code: string, message: string) => new PushNotificationError(code, message);

export const normalizePushError = (error: unknown) => {
  if (error instanceof PushNotificationError) return error;
  return controlledError("push-operation-failed", "Bildirim işlemi tamamlanamadı. Lütfen tekrar deneyin.");
};

export const urlBase64ToUint8Array = (value: string) => {
  const normalized = value.trim();
  if (!normalized || !/^[A-Za-z0-9_-]+$/.test(normalized)) {
    throw controlledError("invalid-vapid-key", "Bildirim yapılandırması geçersiz.");
  }

  const padding = "=".repeat((4 - normalized.length % 4) % 4);
  const base64 = `${normalized}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  try {
    const decoded = window.atob(base64);
    const key = Uint8Array.from(decoded, (character) => character.charCodeAt(0));
    if (key.length !== 65 || key[0] !== 4) throw new Error("invalid P-256 key");
    return key;
  } catch {
    throw controlledError("invalid-vapid-key", "Bildirim yapılandırması geçersiz.");
  }
};

export const getPushSupport = (
  vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY,
): PushSupportResult => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return { status: "unsupported", reason: "browser-unavailable" };
  }
  if (!window.isSecureContext) {
    return { status: "unsupported", reason: "secure-context-required" };
  }

  const standaloneNavigator = navigator as NavigatorWithStandalone;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches === true || standaloneNavigator.standalone === true;
  const hasRegistrationPushManager = "ServiceWorkerRegistration" in window &&
    "pushManager" in ServiceWorkerRegistration.prototype;
  const hasCoreSupport = "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window &&
    hasRegistrationPushManager;

  if (!hasCoreSupport) {
    if (standaloneNavigator.standalone === false && !standalone) {
      return { status: "ios-not-installed", reason: "home-screen-required" };
    }
    return { status: "unsupported", reason: "push-api-unavailable" };
  }
  try {
    urlBase64ToUint8Array(vapidPublicKey ?? "");
  } catch {
    return { status: "misconfigured", reason: "missing-or-invalid-vapid-key" };
  }
  return { status: "supported", reason: null };
};

const requireSupportedPush = () => {
  const support = getPushSupport();
  if (support.status !== "supported") {
    throw controlledError(support.reason ?? "push-unsupported", "Bu cihazda Web Push kullanılamıyor.");
  }
};

const getReadyRegistration = async () => {
  requireSupportedPush();
  return navigator.serviceWorker.ready;
};

export const getBrowserPushSubscription = async () => {
  const registration = await getReadyRegistration();
  return registration.pushManager.getSubscription();
};

export const getOwnedPushSubscription = async (endpoint: string) => {
  const { data, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint")
    .eq("endpoint", endpoint)
    .maybeSingle();
  if (error) throw controlledError("subscription-lookup-failed", "Bildirim aboneliği doğrulanamadı.");
  return data;
};

export const readPushSnapshot = async (userId: string | null): Promise<PushSnapshot> => {
  const support = getPushSupport();
  if (support.status !== "supported") {
    return {
      support,
      permission: typeof Notification === "undefined" ? "unsupported" : Notification.permission,
      browserSubscription: null,
      ownedSubscription: null,
    };
  }

  const permission = Notification.permission;
  if (permission !== "granted") {
    return { support, permission, browserSubscription: null, ownedSubscription: null };
  }

  const browserSubscription = await getBrowserPushSubscription();
  const ownedSubscription = browserSubscription && userId
    ? await getOwnedPushSubscription(browserSubscription.endpoint)
    : null;
  return { support, permission, browserSubscription, ownedSubscription };
};

const serializeSubscription = (subscription: PushSubscription) => {
  const serialized = subscription.toJSON();
  const endpoint = subscription.endpoint?.trim();
  const p256dh = serialized.keys?.p256dh?.trim();
  const auth = serialized.keys?.auth?.trim();
  if (!endpoint || !p256dh || !auth) {
    throw controlledError("invalid-subscription", "Tarayıcı geçerli bir bildirim aboneliği oluşturamadı.");
  }
  return { endpoint, p256dh, auth };
};

export const createDeviceLabel = () => {
  const standaloneNavigator = navigator as NavigatorWithStandalone;
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches === true || standaloneNavigator.standalone === true;
  return standalone ? "Standalone PWA" : "Browser";
};

export const subscribeCurrentDevice = async () => {
  requireSupportedPush();
  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw controlledError("permission-not-granted", "Bildirim izni verilmedi.");
  }

  const registration = await getReadyRegistration();
  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ""),
  });
  const serialized = serializeSubscription(subscription);
  const { data, error } = await supabase.rpc("claim_push_subscription", {
    p_endpoint: serialized.endpoint,
    p_p256dh: serialized.p256dh,
    p_auth: serialized.auth,
    p_device_label: createDeviceLabel(),
    p_user_agent: navigator.userAgent,
  });
  if (error || !data) {
    throw controlledError("subscription-claim-failed", "Bildirim aboneliği hesaba bağlanamadı.");
  }
  return { id: data, subscription };
};

export const disconnectCurrentDevice = async (): Promise<DisconnectPushResult> => {
  const errors: Error[] = [];
  let browserUnsubscribed = false;
  let serverRowDeleted = false;
  let subscription: PushSubscription | null = null;

  try {
    subscription = await getBrowserPushSubscription();
    if (!subscription) {
      return { browserUnsubscribed: true, serverRowDeleted: true, errors };
    }
  } catch (error) {
    errors.push(normalizePushError(error));
    return { browserUnsubscribed, serverRowDeleted, errors };
  }

  const endpoint = subscription.endpoint;
  try {
    browserUnsubscribed = await subscription.unsubscribe();
    if (!browserUnsubscribed) {
      errors.push(controlledError("browser-unsubscribe-failed", "Tarayıcı aboneliği kapatılamadı."));
    }
  } catch {
    errors.push(controlledError("browser-unsubscribe-failed", "Tarayıcı aboneliği kapatılamadı."));
  }

  try {
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (error) throw error;
    serverRowDeleted = true;
  } catch {
    errors.push(controlledError("server-delete-failed", "Sunucu abonelik kaydı temizlenemedi."));
  }

  return { browserUnsubscribed, serverRowDeleted, errors };
};
