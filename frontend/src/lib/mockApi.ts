import { SERVICE_DEFAULTS } from "./serviceConfig";
import type { ToolCallLogEntry } from "./types";

const DEFAULT_BASE_URL = SERVICE_DEFAULTS.mockEnterprise;

export class MockApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit, baseUrl = DEFAULT_BASE_URL): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => undefined);
  if (!res.ok) {
    const message =
      (body && typeof body === "object" && "detail" in body
        ? String((body as { detail?: unknown }).detail)
        : undefined) ?? `HTTP ${res.status}`;
    throw new MockApiError(res.status, message);
  }
  return body as T;
}

/**
 * Runs a mock-enterprise call and records it as a tool-call log entry —
 * the same shape the Phase 4 LangGraph agent's real tool layer will produce.
 */
export async function callTool<T>(
  name: string,
  input: Record<string, unknown>,
  fn: () => Promise<T>
): Promise<{ result: T; log: ToolCallLogEntry }> {
  const start = performance.now();
  try {
    const result = await fn();
    const durationMs = Math.round(performance.now() - start);
    return {
      result,
      log: {
        id: crypto.randomUUID(),
        name,
        status: "success",
        durationMs,
        input,
        output: result,
      },
    };
  } catch (err) {
    const durationMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : "Unknown error";
    const log: ToolCallLogEntry = {
      id: crypto.randomUUID(),
      name,
      status: "error",
      durationMs,
      input,
      error: message,
    };
    throw new ToolExecutionError(log);
  }
}

/** Carries the failed tool's log entry alongside the thrown error. */
export class ToolExecutionError extends Error {
  log: ToolCallLogEntry;
  constructor(log: ToolCallLogEntry) {
    super(log.error ?? "Tool execution failed");
    this.log = log;
  }
}

// -------------------------------------------------------------------- //
// Domain calls — thin wrappers around the mock-enterprise REST API.
// Mirrors the tool list from the FinVoice Ops spec (§9): get_policy,
// check_policy_coverage, create_claim, get_claim_status, get_customer's
// cards, freeze_card, request_new_card, create_support_ticket.
// -------------------------------------------------------------------- //

export interface Policy {
  policyNumber: string;
  customerId: string;
  customer: string;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  vehicle: string;
  coverage: string;
  coveredItems: string[];
  startDate: string;
  endDate: string;
}

export interface Claim {
  claimId: string;
  policyNumber: string;
  status: "OPEN" | "EXPERT_REVIEW" | "APPROVED" | "REJECTED" | "CLOSED";
  accidentDate: string;
  location: string;
  description: string;
  createdAt: string;
}

export interface Card {
  cardId: string;
  customerId: string;
  last4: string;
  type: "DEBIT" | "CREDIT";
  status: "ACTIVE" | "FROZEN" | "CANCELLED" | "PENDING";
}

export interface CoverageCheckResponse {
  policyNumber: string;
  topic: string;
  covered: boolean;
  detail: string;
}

export const mockApi = {
  getPolicy: (policyNumber: string, baseUrl?: string) =>
    request<Policy>(`/api/policies/${encodeURIComponent(policyNumber)}`, undefined, baseUrl),

  checkCoverage: (policyNumber: string, topic: string, baseUrl?: string) =>
    request<CoverageCheckResponse>(
      `/api/policies/${encodeURIComponent(policyNumber)}/coverage?topic=${encodeURIComponent(topic)}`,
      undefined,
      baseUrl
    ),

  createClaim: (
    input: {
      policyNumber: string;
      accidentDate: string;
      location: string;
      description: string;
    },
    baseUrl?: string
  ) =>
    request<Claim>(
      `/api/claims`,
      { method: "POST", body: JSON.stringify(input) },
      baseUrl
    ),

  getClaimStatus: (claimId: string, baseUrl?: string) =>
    request<Claim>(`/api/claims/${encodeURIComponent(claimId)}`, undefined, baseUrl),

  listCustomerCards: (customerId: string, baseUrl?: string) =>
    request<Card[]>(`/api/customers/${encodeURIComponent(customerId)}/cards`, undefined, baseUrl),

  getCustomer: (customerId: string, baseUrl?: string) =>
    request<{ customerId: string; name: string }>(
      `/api/customers/${encodeURIComponent(customerId)}`,
      undefined,
      baseUrl
    ),

  freezeCard: (cardId: string, baseUrl?: string) =>
    request<{ cardId: string; status: string }>(
      `/api/cards/${encodeURIComponent(cardId)}/freeze`,
      { method: "POST" },
      baseUrl
    ),

  requestReplacementCard: (cardId: string, baseUrl?: string) =>
    request<{
      newCardId: string;
      replacesCardId: string;
      status: string;
      estimatedDeliveryDays: number;
    }>(
      `/api/cards/${encodeURIComponent(cardId)}/request-replacement`,
      { method: "POST" },
      baseUrl
    ),

  createSupportTicket: (
    input: { customerId: string; subject: string; description: string },
    baseUrl?: string
  ) =>
    request(`/api/support/tickets`, { method: "POST", body: JSON.stringify(input) }, baseUrl),
};
