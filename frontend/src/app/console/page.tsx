"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { ChatConsole } from "@/components/ChatConsole";
import { MicVisualizer } from "@/components/MicVisualizer";
import { ToolActivityPanel } from "@/components/ToolActivityPanel";
import { TranscriptPanel } from "@/components/TranscriptPanel";
import { PageBody, PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
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

export default function ConsolePage() {
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
      const message = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
      setConnectionError(
        `Agent'a ulaşılamadı: ${message}. mock-enterprise servisinin çalıştığından emin olun (bkz. Ayarlar).`
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
    <>
      <PageHeader
        breadcrumb="Faz 2-4"
        title="Voice Console"
        description="Metin modu demo — serbest, doğal dilde konuşarak hasar dosyası açma, poliçe sorgulama, kayıp kart bildirimi gibi işlemleri deneyin."
        action={<Badge tone="brand">Scripted demo agent</Badge>}
      />
      <PageBody>
        {connectionError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {connectionError}
          </div>
        )}

        <div className="mb-4">
          <MicVisualizer />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
          <div className="min-h-[420px]">
            <TranscriptPanel messages={messages} />
          </div>
          <div className="min-h-[420px]">
            <ToolActivityPanel
              intent={intent}
              confidence={confidence}
              toolCalls={toolCalls}
              handoff={handoff}
            />
          </div>
        </div>

        <div className="mt-4">
          <ChatConsole onSend={send} onReset={reset} disabled={sending} />
        </div>
      </PageBody>
    </>
  );
}
