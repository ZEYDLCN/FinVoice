"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Volume2 } from "lucide-react";
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
  const [responseMode, setResponseMode] = useState<AgentTurnResponse["responseMode"]>("llm");
  const [sending, setSending] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlsRef = useRef(new Map<string, string>());

  useEffect(() => {
    const audioUrls = audioUrlsRef.current;
    return () => {
      audioRef.current?.pause();
      audioUrls.forEach((url) => URL.revokeObjectURL(url));
      audioUrls.clear();
    };
  }, []);

  const speak = async (message: TranscriptMessage) => {
    audioRef.current?.pause();
    setSpeakingMessageId(message.id);
    setVoiceError(null);

    try {
      let audioUrl = audioUrlsRef.current.get(message.id);
      if (!audioUrl) {
        setVoiceLoading(true);
        const res = await fetch("/api/voice/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: message.text }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `HTTP ${res.status}`);
        }
        const blob = await res.blob();
        audioUrl = URL.createObjectURL(blob);
        audioUrlsRef.current.set(message.id, audioUrl);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setSpeakingMessageId(null);
      audio.onerror = () => {
        setSpeakingMessageId(null);
        setVoiceError("Ses tarayıcı tarafından oynatılamadı.");
      };
      setVoiceLoading(false);
      await audio.play();
    } catch (error) {
      setVoiceLoading(false);
      setSpeakingMessageId(null);
      setVoiceError(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Tarayıcı otomatik oynatmayı engelledi. AI mesajının altındaki Dinle düğmesine tıklayın."
          : `Ses oluşturulamadı: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`
      );
    }
  };

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
      const replyMessage = uiMessage("ai", data.reply);
      setMessages((prev) => [...prev, replyMessage]);
      setToolCalls((prev) => [...prev, ...data.toolCalls]);
      setIntent(data.intent);
      setConfidence(data.confidence);
      setHandoff(data.handoff);
      setResponseMode(data.responseMode);
      void speak(replyMessage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.";
      setConnectionError(
        `Agent'a ulaşılamadı: ${message}. Backend ve Ollama servislerinin çalıştığından emin olun.`
      );
    } finally {
      setSending(false);
    }
  };

  const reset = async () => {
    const sessionId = getSessionId();
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // A fresh in-memory id will be generated if storage is unavailable.
    }
    setMessages([]);
    setToolCalls([]);
    setIntent(null);
    setConfidence(null);
    setHandoff(null);
    setResponseMode("llm");
    setConnectionError(null);
    setVoiceError(null);
    audioRef.current?.pause();
    setSpeakingMessageId(null);
    await fetch("/api/agent/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    }).catch(() => undefined);
  };

  return (
    <>
      <PageHeader
        breadcrumb="Faz 4-8"
        title="Voice Console"
        description="LangGraph ve yerel Ollama modeliyle çalışan sesli müşteri asistanı."
        action={<Badge tone="brand">LangGraph + Ollama</Badge>}
      />
      <PageBody>
        {connectionError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--danger)]/30 bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {connectionError}
          </div>
        )}

        {voiceError && (
          <div className="mb-4 flex items-start gap-2 rounded-lg border border-[var(--warning)]/30 bg-[var(--warning-soft)] px-4 py-3 text-sm text-[var(--warning)]">
            <Volume2 className="mt-0.5 h-4 w-4 shrink-0" />
            {voiceError}
          </div>
        )}

        <div className="mb-4">
          <MicVisualizer />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[2fr_1fr]">
          <div className="min-h-[420px]">
            <TranscriptPanel
              messages={messages}
              onSpeak={(message) => void speak(message)}
              speakingMessageId={speakingMessageId}
              voiceLoading={voiceLoading}
            />
          </div>
          <div className="min-h-[420px]">
            <ToolActivityPanel
              intent={intent}
              confidence={confidence}
              toolCalls={toolCalls}
              handoff={handoff}
              responseMode={responseMode}
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
