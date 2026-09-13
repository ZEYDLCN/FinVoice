"use client";

import { useState } from "react";
import { ChatConsole } from "@/components/ChatConsole";
import { MicVisualizer } from "@/components/MicVisualizer";
import { ToolActivityPanel } from "@/components/ToolActivityPanel";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import type {
  AgentTurnResponse,
  HandoffContext,
  Intent,
  ToolCallLogEntry,
  TranscriptMessage,
} from "@/lib/types";

const SESSION_STORAGE_KEY = "finvoice.sessionId";

/**
 * Lazily reads (or creates) the session id from localStorage. Only ever
 * called from client event handlers, never during render/SSR, so there is
 * no hydration-mismatch or "setState in effect" concern to work around.
 */
function getSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function uiMessage(role: TranscriptMessage["role"], text: string): TranscriptMessage {
  return { id: crypto.randomUUID(), role, text, timestamp: new Date().toISOString() };
}

export default function Home() {
  const [messages, setMessages] = useState<TranscriptMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<ToolCallLogEntry[]>([]);
  const [intent, setIntent] = useState<Intent>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [handoff, setHandoff] = useState<HandoffContext | null>(null);
  const [sending, setSending] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const send = async (text: string) => {
    const sessionId = getSessionId();
    setMessages((prev) => [...prev, uiMessage("customer", text)]);
    setSending(true);
    setConnectionError(null);
    try {
      const res = await fetch("/api/agent/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data: AgentTurnResponse = await res.json();
      setMessages((prev) => [...prev, uiMessage("ai", data.reply)]);
      setToolCalls((prev) => [...prev, ...data.toolCalls]);
      setIntent(data.intent);
      setConfidence(data.confidence);
      setHandoff(data.handoff);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Bilinmeyen bir hata oluştu.";
      setConnectionError(
        `Agent'a ulaşılamadı: ${message}. mock-enterprise servisinin çalıştığından ve MOCK_ENTERPRISE_URL'in doğru ayarlandığından emin olun.`
      );
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    const sessionId = getSessionId();
    setMessages([]);
    setToolCalls([]);
    setIntent(null);
    setConfidence(null);
    setHandoff(null);
    setConnectionError(null);
    await fetch("/api/agent/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => undefined);
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 p-4 md:p-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-100">FinVoice Ops — Voice Console</h1>
        <p className="text-sm text-slate-500">
          Faz 2 demo — metin modu. Gerçek ses pipeline&apos;ı (VAD/STT/TTS) Faz 3 ve 5&apos;te,
          LangGraph agent Faz 4&apos;te eklenecek.
        </p>
      </header>

      {connectionError && (
        <div className="rounded-lg border border-red-800 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          {connectionError}
        </div>
      )}

      <MicVisualizer />

      <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
        <div className="min-h-[360px]">
          <TranscriptPanel messages={messages} />
        </div>
        <div className="min-h-[360px]">
          <ToolActivityPanel
            intent={intent}
            confidence={confidence}
            toolCalls={toolCalls}
            handoff={handoff}
          />
        </div>
      </div>

      <ChatConsole onSend={send} onReset={reset} disabled={sending} />
    </div>
  );
}
