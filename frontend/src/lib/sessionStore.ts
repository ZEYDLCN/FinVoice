import type { ConversationState } from "./types";

/**
 * In-memory, per-process session store. Good enough for the Phase 2
 * text-mode demo (single Next.js dev/prod instance, no horizontal
 * scaling). Phase 4 replaces this with real session/memory management
 * (see ROADMAP.md — "Conversation state / memory yönetimi").
 */
const sessions = new Map<string, ConversationState>();

export function freshState(): ConversationState {
  return {
    intent: null,
    awaitingSlot: null,
    slots: {},
    originalUtterance: null,
    confusionCount: 0,
    history: [],
    handoff: null,
  };
}

export function getSession(sessionId: string): ConversationState {
  let state = sessions.get(sessionId);
  if (!state) {
    state = freshState();
    sessions.set(sessionId, state);
  }
  return state;
}

export function saveSession(sessionId: string, state: ConversationState): void {
  sessions.set(sessionId, state);
}

export function resetSession(sessionId: string): ConversationState {
  const state = freshState();
  sessions.set(sessionId, state);
  return state;
}
