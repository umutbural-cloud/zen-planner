import { describe, expect, it } from "vitest";
import {
  classifyDeliveryStatus,
  createDeliveryDiagnostics,
  createDeliveryLog,
  endpointHostname,
  parseDiagnosticRequestBody,
  recordDeliveryOutcome,
  type DeliveryOutcome,
} from "../../supabase/functions/test-push/deliveryDiagnostics";

const CURRENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

describe("delivery outcome classification", () => {
  it.each([
    [201, "accepted"],
    [202, "accepted"],
    [404, "expired"],
    [410, "expired"],
    [400, "rejected"],
    [401, "rejected"],
    [403, "rejected"],
    [429, "retryable-failure"],
    [500, "retryable-failure"],
    [503, "retryable-failure"],
    [undefined, "transport-failure"],
  ] as const)("classifies %s as %s", (statusCode, expected) => {
    expect(classifyDeliveryStatus(statusCode)).toBe(expected);
  });

  it("aggregates statuses, outcomes, and keeps sent equal to accepted", () => {
    const diagnostics = createDeliveryDiagnostics(CURRENT_ID);
    const deliveries: Array<[string, DeliveryOutcome, number | undefined]> = [
      [CURRENT_ID, "accepted", 201],
      [OTHER_ID, "expired", 410],
      [OTHER_ID, "transport-failure", undefined],
    ];
    for (const [subscriptionId, outcome, statusCode] of deliveries) {
      recordDeliveryOutcome(diagnostics, {
        subscriptionId,
        currentSubscriptionId: CURRENT_ID,
        outcome,
        statusCode,
      });
    }

    expect(diagnostics.accepted).toBe(1);
    expect(diagnostics.sent).toBe(diagnostics.accepted);
    expect(diagnostics.outcomes).toEqual({
      accepted: 1,
      expired: 1,
      rejected: 0,
      retryable_failure: 0,
      transport_failure: 1,
      cleanup_failure: 0,
    });
    expect(diagnostics.response_statuses).toEqual({ unknown: 1, "201": 1, "410": 1 });
  });

  it.each([
    ["accepted", 201],
    ["expired", 410],
    ["rejected", 403],
  ] as const)("records a matched current subscription with %s", (outcome, statusCode) => {
    const diagnostics = createDeliveryDiagnostics(CURRENT_ID);
    recordDeliveryOutcome(diagnostics, {
      subscriptionId: CURRENT_ID,
      currentSubscriptionId: CURRENT_ID,
      outcome,
      statusCode,
    });
    expect(diagnostics.current_subscription).toEqual({ matched: true, outcome, status_code: statusCode });
  });

  it("keeps a requested but unmatched current subscription anonymous", () => {
    const diagnostics = createDeliveryDiagnostics(CURRENT_ID);
    recordDeliveryOutcome(diagnostics, {
      subscriptionId: OTHER_ID,
      currentSubscriptionId: CURRENT_ID,
      outcome: "accepted",
      statusCode: 201,
    });
    expect(diagnostics.current_subscription).toEqual({ matched: false, outcome: null, status_code: null });
  });

  it("omits current subscription diagnostics when no id was requested", () => {
    expect(createDeliveryDiagnostics(null).current_subscription).toBeNull();
  });
});

describe("diagnostic request parsing", () => {
  it.each(["", "   ", "{}"])("accepts an absent or empty diagnostic target", (body) => {
    expect(parseDiagnosticRequestBody(body)).toBeNull();
  });

  it("accepts a valid UUID", () => {
    expect(parseDiagnosticRequestBody(JSON.stringify({ current_subscription_id: CURRENT_ID }))).toBe(CURRENT_ID);
  });

  it.each(["not-json", "null", "[]", '{"current_subscription_id":"invalid"}'])(
    "rejects malformed diagnostic input: %s",
    (body) => expect(() => parseDiagnosticRequestBody(body)).toThrow("Invalid diagnostic request"),
  );
});

describe("safe delivery logs", () => {
  it("extracts only the endpoint hostname", () => {
    const endpoint = "https://fcm.googleapis.com/fcm/send/private-token?secret=value";
    expect(endpointHostname(endpoint)).toBe("fcm.googleapis.com");
    const log = createDeliveryLog({
      endpoint,
      statusCode: 201,
      outcome: "accepted",
      durationMs: 12.6,
      isCurrentSubscription: true,
    });
    expect(log).toEqual({
      event: "test_push_delivery",
      endpoint_host: "fcm.googleapis.com",
      status_code: 201,
      outcome: "accepted",
      duration_ms: 13,
      is_current_subscription: true,
    });
    expect(JSON.stringify(log)).not.toContain("private-token");
    expect(JSON.stringify(log)).not.toContain("secret=value");
  });

  it("uses invalid for an unparseable endpoint and clamps duration", () => {
    expect(endpointHostname("not a url")).toBe("invalid");
    expect(createDeliveryLog({
      endpoint: "not a url",
      outcome: "transport-failure",
      durationMs: -4,
      isCurrentSubscription: false,
      errorCategory: "NetworkError",
    })).toEqual({
      event: "test_push_delivery",
      endpoint_host: "invalid",
      status_code: null,
      outcome: "transport-failure",
      duration_ms: 0,
      is_current_subscription: false,
      error_category: "NetworkError",
    });
  });

  it("never includes sensitive delivery fields", () => {
    const log = createDeliveryLog({
      endpoint: "https://push.example/path",
      outcome: "accepted",
      statusCode: 202,
      durationMs: 1,
      isCurrentSubscription: false,
    });
    for (const field of ["endpoint", "subscription_id", "user_id", "p256dh", "auth", "jwt", "body", "headers"]) {
      expect(log).not.toHaveProperty(field);
    }
  });

  it("keeps every counter a non-negative integer", () => {
    const diagnostics = createDeliveryDiagnostics(null);
    recordDeliveryOutcome(diagnostics, {
      subscriptionId: OTHER_ID,
      currentSubscriptionId: null,
      outcome: "cleanup-failure",
      statusCode: 410,
    });
    const counters = [diagnostics.accepted, diagnostics.sent, ...Object.values(diagnostics.outcomes), ...Object.values(diagnostics.response_statuses)];
    expect(counters.every((value) => Number.isInteger(value) && value >= 0)).toBe(true);
  });
});
