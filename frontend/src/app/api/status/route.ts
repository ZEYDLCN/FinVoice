import { NextResponse } from "next/server";
import { getServiceUrls, SERVICE_LABELS, type ServiceUrls } from "@/lib/serviceConfig";

export interface ServiceStatus {
  key: keyof ServiceUrls;
  label: string;
  url: string;
  ok: boolean;
  latencyMs: number | null;
  error?: string;
}

async function pingService(key: keyof ServiceUrls, url: string): Promise<ServiceStatus> {
  const start = performance.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${url}/health`, { cache: "no-store", signal: controller.signal });
    clearTimeout(timeout);
    const latencyMs = Math.round(performance.now() - start);
    return { key, label: SERVICE_LABELS[key], url, ok: res.ok, latencyMs };
  } catch (err) {
    return {
      key,
      label: SERVICE_LABELS[key],
      url,
      ok: false,
      latencyMs: null,
      error: err instanceof Error ? err.message : "unreachable",
    };
  }
}

export async function GET() {
  const urls = await getServiceUrls();
  const entries = Object.entries(urls) as [keyof ServiceUrls, string][];
  const statuses = await Promise.all(entries.map(([key, url]) => pingService(key, url)));
  return NextResponse.json({ services: statuses });
}
