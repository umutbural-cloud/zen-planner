import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  disconnectCurrentDevice,
  normalizePushError,
  readPushSnapshot,
  subscribeCurrentDevice,
  type DisconnectPushResult,
  type PushSnapshot,
} from "@/services/pushNotifications";

export type PushNotificationStatus =
  | "loading"
  | "unsupported"
  | "ios-not-installed"
  | "permission-default"
  | "permission-denied"
  | "granted-not-subscribed"
  | "subscribed"
  | "error";

const deriveStatus = (snapshot: PushSnapshot): PushNotificationStatus => {
  if (snapshot.support.status === "ios-not-installed") return "ios-not-installed";
  if (snapshot.support.status === "unsupported") return "unsupported";
  if (snapshot.support.status === "misconfigured") return "error";
  if (snapshot.permission === "default") return "permission-default";
  if (snapshot.permission === "denied") return "permission-denied";
  if (snapshot.permission !== "granted") return "unsupported";
  return snapshot.browserSubscription && snapshot.ownedSubscription
    ? "subscribed"
    : "granted-not-subscribed";
};

export const usePushNotifications = () => {
  const { user } = useAuth();
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const [status, setStatus] = useState<PushNotificationStatus>("loading");
  const [snapshot, setSnapshot] = useState<PushSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [disconnectResult, setDisconnectResult] = useState<DisconnectPushResult | null>(null);

  const refresh = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (mountedRef.current) {
      setStatus("loading");
      setError(null);
    }
    try {
      const nextSnapshot = await readPushSnapshot(user?.id ?? null);
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setSnapshot(nextSnapshot);
      if (nextSnapshot.support.status === "misconfigured") {
        setError(new Error("Bildirim public key yapılandırması eksik veya geçersiz."));
      }
      setStatus(deriveStatus(nextSnapshot));
    } catch (nextError) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setError(normalizePushError(nextError));
      setStatus("error");
    }
  }, [user?.id]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [refresh]);

  const subscribe = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (mountedRef.current) {
      setStatus("loading");
      setError(null);
      setDisconnectResult(null);
    }
    try {
      await subscribeCurrentDevice();
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      await refresh();
    } catch (nextError) {
      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      setError(normalizePushError(nextError));
      setStatus("error");
    }
  }, [refresh]);

  const unsubscribe = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    if (mountedRef.current) {
      setStatus("loading");
      setError(null);
    }
    const result = await disconnectCurrentDevice();
    if (!mountedRef.current || requestId !== requestIdRef.current) return result;
    setDisconnectResult(result);
    if (!result.browserUnsubscribed && !result.serverRowDeleted) {
      setError(result.errors[0] ?? new Error("Bildirim aboneliği kapatılamadı."));
      setStatus("error");
      return result;
    }
    await refresh();
    return result;
  }, [refresh]);

  return {
    status,
    permission: snapshot?.permission ?? "unsupported",
    browserSubscription: snapshot?.browserSubscription ?? null,
    hasBrowserSubscription: Boolean(snapshot?.browserSubscription),
    ownedSubscription: snapshot?.ownedSubscription ?? null,
    hasOwnedSubscription: Boolean(snapshot?.ownedSubscription),
    error,
    disconnectResult,
    refresh,
    subscribe,
    unsubscribe,
  };
};
