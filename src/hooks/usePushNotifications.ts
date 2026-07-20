import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  disconnectCurrentDevice,
  normalizePushError,
  readPushSnapshot,
  sendTestPushNotification,
  subscribeCurrentDevice,
  type DisconnectPushResult,
  type PushSnapshot,
  type TestPushResult,
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

export type PushOperation = "refresh" | "subscribe" | "unsubscribe" | "test-push" | null;

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
  const operationRef = useRef<PushOperation>(null);
  const [status, setStatus] = useState<PushNotificationStatus>("loading");
  const [snapshot, setSnapshot] = useState<PushSnapshot | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [disconnectResult, setDisconnectResult] = useState<DisconnectPushResult | null>(null);
  const [testResult, setTestResult] = useState<TestPushResult | null>(null);
  const [activeOperation, setActiveOperation] = useState<PushOperation>(null);

  const applySnapshot = useCallback(async (requestId: number) => {
    const nextSnapshot = await readPushSnapshot(user?.id ?? null);
    if (!mountedRef.current || requestId !== requestIdRef.current) return;
    setSnapshot(nextSnapshot);
    if (nextSnapshot.support.status === "misconfigured") {
      setError(new Error("Bildirim public key yapılandırması eksik veya geçersiz."));
    }
    setStatus(deriveStatus(nextSnapshot));
  }, [user?.id]);

  const beginOperation = useCallback((operation: Exclude<PushOperation, null>) => {
    if (operationRef.current) return null;
    operationRef.current = operation;
    const requestId = ++requestIdRef.current;
    if (mountedRef.current) {
      setActiveOperation(operation);
      setError(null);
      if (operation !== "test-push") setStatus("loading");
    }
    return requestId;
  }, []);

  const finishOperation = useCallback((operation: Exclude<PushOperation, null>) => {
    if (operationRef.current !== operation) return;
    operationRef.current = null;
    if (mountedRef.current) setActiveOperation(null);
  }, []);

  const refresh = useCallback(async () => {
    const requestId = beginOperation("refresh");
    if (requestId === null) return;
    try {
      await applySnapshot(requestId);
    } catch (nextError) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(normalizePushError(nextError));
        setStatus("error");
      }
    } finally {
      finishOperation("refresh");
    }
  }, [applySnapshot, beginOperation, finishOperation]);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      operationRef.current = null;
    };
  }, [refresh]);

  const subscribe = useCallback(async () => {
    const requestId = beginOperation("subscribe");
    if (requestId === null) return false;
    setDisconnectResult(null);
    try {
      await subscribeCurrentDevice();
      await applySnapshot(requestId);
      return true;
    } catch (nextError) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(normalizePushError(nextError));
        setStatus("error");
      }
      return false;
    } finally {
      finishOperation("subscribe");
    }
  }, [applySnapshot, beginOperation, finishOperation]);

  const unsubscribe = useCallback(async () => {
    const requestId = beginOperation("unsubscribe");
    if (requestId === null) return null;
    try {
      const result = await disconnectCurrentDevice();
      if (!mountedRef.current || requestId !== requestIdRef.current) return result;
      setDisconnectResult(result);
      if (!result.browserUnsubscribed && !result.serverRowDeleted) {
        setError(result.errors[0] ?? new Error("Bildirim aboneliği kapatılamadı."));
        setStatus("error");
        return result;
      }
      await applySnapshot(requestId);
      return result;
    } finally {
      finishOperation("unsubscribe");
    }
  }, [applySnapshot, beginOperation, finishOperation]);

  const testPush = useCallback(async () => {
    if (status !== "subscribed") return null;
    const requestId = beginOperation("test-push");
    if (requestId === null) return null;
    setTestResult(null);
    try {
      const result = await sendTestPushNotification();
      if (!mountedRef.current || requestId !== requestIdRef.current) return result;
      setTestResult(result);
      if (result.subscriptions_found === 0 || (result.expired_removed > 0 && result.sent === 0)) {
        await applySnapshot(requestId);
      }
      return result;
    } catch (nextError) {
      if (mountedRef.current && requestId === requestIdRef.current) {
        setError(normalizePushError(nextError));
      }
      return null;
    } finally {
      finishOperation("test-push");
    }
  }, [applySnapshot, beginOperation, finishOperation, status]);

  return {
    status,
    permission: snapshot?.permission ?? "unsupported",
    browserSubscription: snapshot?.browserSubscription ?? null,
    hasBrowserSubscription: Boolean(snapshot?.browserSubscription),
    ownedSubscription: snapshot?.ownedSubscription ?? null,
    hasOwnedSubscription: Boolean(snapshot?.ownedSubscription),
    error,
    disconnectResult,
    testResult,
    activeOperation,
    isSendingTest: activeOperation === "test-push",
    refresh,
    subscribe,
    unsubscribe,
    testPush,
  };
};
