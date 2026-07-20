export type DeliveryOutcome =
  | "accepted"
  | "expired"
  | "rejected"
  | "retryable-failure"
  | "transport-failure"
  | "cleanup-failure";

export type OutcomeCounts = {
  accepted: number;
  expired: number;
  rejected: number;
  retryable_failure: number;
  transport_failure: number;
  cleanup_failure: number;
};

export type CurrentSubscriptionDiagnostic = null | {
  matched: boolean;
  outcome: DeliveryOutcome | null;
  status_code: number | null;
};

export type DeliveryDiagnostics = {
  accepted: number;
  sent: number;
  outcomes: OutcomeCounts;
  response_statuses: Record<string, number>;
  current_subscription: CurrentSubscriptionDiagnostic;
};

export type DeliveryLog = {
  event: "test_push_delivery";
  endpoint_host: string;
  status_code: number | null;
  outcome: DeliveryOutcome;
  duration_ms: number;
  is_current_subscription: boolean;
  error_category?: string;
};

export class DiagnosticRequestError extends Error {
  constructor() {
    super("Invalid diagnostic request");
    this.name = "DiagnosticRequestError";
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseDiagnosticRequestBody(rawBody: string): string | null {
  if (rawBody.trim() === "") return null;

  let candidate: unknown;
  try {
    candidate = JSON.parse(rawBody);
  } catch {
    throw new DiagnosticRequestError();
  }

  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
    throw new DiagnosticRequestError();
  }

  const currentSubscriptionId = (candidate as Record<string, unknown>).current_subscription_id;
  if (currentSubscriptionId === undefined) return null;
  if (typeof currentSubscriptionId !== "string" || !UUID_PATTERN.test(currentSubscriptionId)) {
    throw new DiagnosticRequestError();
  }

  return currentSubscriptionId;
}

export function classifyDeliveryStatus(statusCode?: number): DeliveryOutcome {
  if (statusCode === undefined || !Number.isInteger(statusCode)) return "transport-failure";
  if (statusCode >= 200 && statusCode <= 299) return "accepted";
  if (statusCode === 404 || statusCode === 410) return "expired";
  if (statusCode === 429 || (statusCode >= 500 && statusCode <= 599)) {
    return "retryable-failure";
  }
  if (statusCode >= 400 && statusCode <= 499) return "rejected";
  return "transport-failure";
}

export function endpointHostname(endpoint: string): string {
  try {
    return new URL(endpoint).hostname || "invalid";
  } catch {
    return "invalid";
  }
}

export function createDeliveryDiagnostics(
  currentSubscriptionId: string | null,
): DeliveryDiagnostics {
  return {
    accepted: 0,
    sent: 0,
    outcomes: {
      accepted: 0,
      expired: 0,
      rejected: 0,
      retryable_failure: 0,
      transport_failure: 0,
      cleanup_failure: 0,
    },
    response_statuses: { unknown: 0 },
    current_subscription: currentSubscriptionId === null
      ? null
      : { matched: false, outcome: null, status_code: null },
  };
}

const outcomeKey = (outcome: DeliveryOutcome): keyof OutcomeCounts =>
  outcome.replaceAll("-", "_") as keyof OutcomeCounts;

export function recordDeliveryOutcome(
  diagnostics: DeliveryDiagnostics,
  input: {
    subscriptionId: string;
    currentSubscriptionId: string | null;
    outcome: DeliveryOutcome;
    statusCode?: number;
  },
): void {
  diagnostics.outcomes[outcomeKey(input.outcome)] += 1;
  if (input.outcome === "accepted") {
    diagnostics.accepted += 1;
    diagnostics.sent += 1;
  }

  const statusKey = input.statusCode === undefined ? "unknown" : String(input.statusCode);
  diagnostics.response_statuses[statusKey] = (diagnostics.response_statuses[statusKey] ?? 0) + 1;

  if (
    input.currentSubscriptionId !== null &&
    input.subscriptionId === input.currentSubscriptionId
  ) {
    diagnostics.current_subscription = {
      matched: true,
      outcome: input.outcome,
      status_code: input.statusCode ?? null,
    };
  }
}

export function createDeliveryLog(input: {
  endpoint: string;
  statusCode?: number;
  outcome: DeliveryOutcome;
  durationMs: number;
  isCurrentSubscription: boolean;
  errorCategory?: string;
}): DeliveryLog {
  const log: DeliveryLog = {
    event: "test_push_delivery",
    endpoint_host: endpointHostname(input.endpoint),
    status_code: input.statusCode ?? null,
    outcome: input.outcome,
    duration_ms: Math.max(0, Math.round(input.durationMs)),
    is_current_subscription: input.isCurrentSubscription,
  };
  if (input.errorCategory) log.error_category = input.errorCategory;
  return log;
}
