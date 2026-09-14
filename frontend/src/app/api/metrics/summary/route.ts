import { NextResponse } from "next/server";
import {
  groupByLabel,
  histogramAverage,
  parsePrometheusText,
  sumMetric,
} from "@/lib/prometheusParser";
import { getServiceUrls } from "@/lib/serviceConfig";

async function fetchMetrics(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${url}/metrics`, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function GET() {
  const urls = await getServiceUrls();
  const [backendText, voiceText, ragText, mockText] = await Promise.all([
    fetchMetrics(urls.backend),
    fetchMetrics(urls.voice),
    fetchMetrics(urls.rag),
    fetchMetrics(urls.mockEnterprise),
  ]);

  const available = {
    backend: backendText !== null,
    voice: voiceText !== null,
    rag: ragText !== null,
    mockEnterprise: mockText !== null,
  };

  let business = null;
  let tools: Array<{ tool: string; success: number; error: number; avgDurationMs: number | null }> = [];
  if (backendText) {
    const s = parsePrometheusText(backendText);
    const chatTurns = sumMetric(s, "finvoice_chat_turns_total");
    const handoffByTrigger = groupByLabel(s, "finvoice_handoff_total", "trigger");
    const handoffTotal = Object.values(handoffByTrigger).reduce((a, b) => a + b, 0);
    const activeSessions = sumMetric(s, "finvoice_active_sessions");
    const avgLatencyMs = histogramAverage(s, "finvoice_chat_latency_seconds");

    const successByTool = groupByLabel(
      s.filter((x) => x.labels.status === "success"),
      "finvoice_tool_calls_total",
      "tool"
    );
    const errorByTool = groupByLabel(
      s.filter((x) => x.labels.status === "error"),
      "finvoice_tool_calls_total",
      "tool"
    );
    const toolNames = new Set([...Object.keys(successByTool), ...Object.keys(errorByTool)]);
    tools = [...toolNames].map((tool) => ({
      tool,
      success: successByTool[tool] ?? 0,
      error: errorByTool[tool] ?? 0,
      avgDurationMs: (() => {
        const avg = s.find((x) => x.name === "finvoice_tool_call_duration_seconds_sum" && x.labels.tool === tool);
        const count = s.find((x) => x.name === "finvoice_tool_call_duration_seconds_count" && x.labels.tool === tool);
        if (!avg || !count || count.value === 0) return null;
        return Math.round((avg.value / count.value) * 1000);
      })(),
    }));

    business = {
      chatTurns,
      activeSessions,
      handoffTotal,
      handoffByTrigger,
      automationRatePct: chatTurns > 0 ? Math.round((1 - handoffTotal / chatTurns) * 1000) / 10 : null,
      handoffRatePct: chatTurns > 0 ? Math.round((handoffTotal / chatTurns) * 1000) / 10 : null,
      avgLatencyMs: avgLatencyMs !== null ? Math.round(avgLatencyMs * 1000) : null,
    };
  }

  let voice = null;
  if (voiceText) {
    const s = parsePrometheusText(voiceText);
    const toMs = (v: number | null) => (v !== null ? Math.round(v * 1000) : null);
    voice = {
      vadAvgMs: toMs(histogramAverage(s, "finvoice_voice_vad_latency_seconds")),
      sttAvgMs: toMs(histogramAverage(s, "finvoice_voice_stt_latency_seconds")),
      ttsAvgMs: toMs(histogramAverage(s, "finvoice_voice_tts_latency_seconds")),
      transcriptionsTotal: sumMetric(s, "finvoice_voice_transcriptions_total"),
    };
  }

  const httpTotals: Record<string, number | null> = {
    backend: backendText ? sumMetric(parsePrometheusText(backendText), "http_requests_total") : null,
    voice: voiceText ? sumMetric(parsePrometheusText(voiceText), "http_requests_total") : null,
    rag: ragText ? sumMetric(parsePrometheusText(ragText), "http_requests_total") : null,
    mockEnterprise: mockText ? sumMetric(parsePrometheusText(mockText), "http_requests_total") : null,
  };

  return NextResponse.json({ available, business, tools, voice, httpTotals });
}
