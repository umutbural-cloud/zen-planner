import { createClient } from "@supabase/supabase-js";
import webPush from "web-push";

type PushSubscriptionRow = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

type SendError = Error & { statusCode?: number };

const jsonHeaders = {
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
  if (!normalized.includes(":")) return false;

  if (normalized === "::" || normalized === "::1") return true;
  if (/^f[cd]/.test(normalized) || /^fe[89ab]/.test(normalized)) return true;

  const mappedIpv4 = normalized.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  return mappedIpv4 ? isUnsafeIpv4(mappedIpv4) : false;
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
  let sent = 0;
  let expiredRemoved = 0;
  let failed = 0;

  for (const subscription of subscriptions) {
    if (!isSafePushEndpoint(subscription.endpoint)) {
      failed += 1;
      continue;
    }

    try {
      await webPush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload, { TTL: 60 });
      sent += 1;
    } catch (error) {
      const statusCode = (error as SendError).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        const { error: deleteError } = await supabase
          .from("push_subscriptions")
          .delete()
          .eq("id", subscription.id)
          .eq("user_id", userData.user.id);

        if (deleteError) {
          console.error("test-push expired subscription cleanup failed", deleteError.message);
          failed += 1;
        } else {
          expiredRemoved += 1;
        }
      } else {
        failed += 1;
      }
    }
  }

  return jsonResponse({
    subscriptions_found: subscriptions.length,
    sent,
    expired_removed: expiredRemoved,
    failed,
  }, 200);
});
