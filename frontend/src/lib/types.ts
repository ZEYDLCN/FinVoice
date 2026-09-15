export type Role = "customer" | "ai" | "system";

export interface TranscriptMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: string; // ISO
}

export type ToolCallStatus = "success" | "error";

export interface ToolCallLogEntry {
  id: string;
  name: string;
  status: ToolCallStatus;
  durationMs: number;
  input?: Record<string, unknown>;
  output?: unknown;
  error?: string;
}

export type Intent =
  | "create_claim"
  | "claim_status"
  | "policy_coverage"
  | "lost_card"
  | "human_handoff"
  | null;

export interface HandoffContext {
  customerName?: string;
  intent: Intent;
  policyNumber?: string;
  collectedData: Record<string, string>;
  reason: string;
  summary: string;
}

/** Server-side conversation state, keyed by sessionId. */
export interface ConversationState {
  intent: Intent;
  awaitingSlot: string | null;
  slots: Record<string, string>;
  originalUtterance: string | null;
  confusionCount: number;
  history: TranscriptMessage[];
  handoff: HandoffContext | null;
}

export interface AgentTurnResponse {
  reply: string;
  intent: Intent;
  toolCalls: ToolCallLogEntry[];
  handoff: HandoffContext | null;
  confidence: number | null;
  responseMode: "llm" | "tool" | "validation" | "guardrail" | "scripted";
}
