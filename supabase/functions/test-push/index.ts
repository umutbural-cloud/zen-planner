import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";
import {
  classifyDeliveryStatus,
  createDeliveryDiagnostics,
  createDeliveryLog,
  DiagnosticRequestError,
  parseDiagnosticRequestBody,
  recordDeliveryOutcome,
  type DeliveryOutcome,
} from "./deliveryDiagnostics.ts";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type SendResult = { statusCode?: number };
type SendError = Error & { statusCode?: number };

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers":
    "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};

const jsonHeaders = {
  ...corsHeaders,
  "content-type": "application/json; charset=utf-8",
};

const payload = JSON.stringify({
  type: "test",
  title: "Zen Planner",
  body: "Bildirimler çalışıyor.",
  url: "/",
  tag: "zen-planner-test-push",
});

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function isUnsafeIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) {
    return false;
  }

  const octets = parts.map(Number);
  if (octets.some((octet) => octet > 255)) return true;

  const [first, second] = octets;
  return first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224;
}

function isUnsafeIpv6(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  return normalized.includes(":");
}

function isSafePushEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    const hostname = url.hostname.toLowerCase();

    return url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      hostname !== "localhost" &&
      !hostname.endsWith(".localhost") &&
      !isUnsafeIpv4(hostname) &&
      !isUnsafeIpv6(hostname);
  } catch {
    return false;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Server authentication is not configured" }, 500);
  }

  const accessToken = authorization.slice("Bearer ".length).trim();
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    return jsonResponse({ error: "Authentication required" }, 401);
  }

  let currentSubscriptionId: string | null;
  try {
    currentSubscriptionId = parseDiagnosticRequestBody(await request.text());
  } catch (error) {
    if (error instanceof DiagnosticRequestError) {
      return jsonResponse({ error: "Invalid diagnostic request" }, 400);
    }
    console.error({ event: "test_push_request_error", error_category: "RequestReadError" });
    return jsonResponse({ error: "Unable to read request" }, 400);
  }

  const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const vapidSubject = Deno.env.get("VAPID_SUBJECT");
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return jsonResponse({ error: "Web Push is not configured" }, 503);
  }

  try {
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  } catch {
    return jsonResponse({ error: "Web Push configuration is invalid" }, 503);
  }

  const { data, error: lookupError } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userData.user.id);

  if (lookupError) {
    console.error("test-push subscription lookup failed", lookupError.message);
    return jsonResponse({ error: "Unable to load push subscriptions" }, 500);
  }

  const subscriptions = (data ?? []) as PushSubscriptionRow[];
  let expiredRemoved = 0;
  let failed = 0;
  const diagnostics = createDeliveryDiagnostics(currentSubscriptionId);

  for (const subscription of subscriptions) {
    const startedAt = performance.now();
    const isCurrentSubscription = currentSubscriptionId === subscription.id;
    let statusCode: number | undefined;
    let outcome: DeliveryOutcome;
    let errorCategory: string | undefined;

    if (!isSafePushEndpoint(subscription.endpoint)) {
      outcome = "rejected";
      errorCategory = "UnsafeEndpoint";
      failed += 1;
      recordDeliveryOutcome(diagnostics, {
        subscriptionId: subscription.id,
        currentSubscriptionId,
        outcome,
      });
      console.warn(createDeliveryLog({
        endpoint: subscription.endpoint,
        outcome,
        durationMs: performance.now() - startedAt,
        isCurrentSubscription,
        errorCategory,
      }));
      continue;
    }

    try {
      const result = await webPush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload, { TTL: 60 }) as SendResult;
      statusCode = result.statusCode;
      outcome = classifyDeliveryStatus(statusCode);
      if (outcome !== "accepted") failed += 1;
    } catch (error) {
      statusCode = (error as SendError).statusCode;
      outcome = classifyDeliveryStatus(statusCode);
      errorCategory = error instanceof Error ? error.name : "UnknownError";
      if (outcome === "expired") {
        const { error: deleteError } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", subscription.id)
          .eq("user_id", userData.user.id);

        if (deleteError) {
          outcome = "cleanup-failure";
          errorCategory = "CleanupError";
          failed += 1;
        } else {
          expiredRemoved += 1;
        }
      } else {
        failed += 1;
      }
    }

    recordDeliveryOutcome(diagnostics, {
      subscriptionId: subscription.id,
      currentSubscriptionId,
      outcome,
      statusCode,
    });
    const log = createDeliveryLog({
      endpoint: subscription.endpoint,
      statusCode,
      outcome,
      durationMs: performance.now() - startedAt,
      isCurrentSubscription,
      errorCategory,
    });
    if (outcome === "accepted") console.info(log);
    else console.warn(log);
  }

  return jsonResponse({
    subscriptions_found: subscriptions.length,
    sent: diagnostics.sent,
    expired_removed: expiredRemoved,
    failed,
    accepted: diagnostics.accepted,
    outcomes: diagnostics.outcomes,
    response_statuses: diagnostics.response_statuses,
    current_subscription: diagnostics.current_subscription,
  }, 200);
});
