import { cookies } from "next/headers";

export interface ServiceUrls {
  mockEnterprise: string;
  backend: string;
  voice: string;
  rag: string;
}

export const SERVICE_DEFAULTS: ServiceUrls = {
  mockEnterprise: process.env.MOCK_ENTERPRISE_URL ?? "http://localhost:8000",
  backend: process.env.AGENT_BACKEND_URL ?? "http://localhost:8200",
  voice: process.env.VOICE_SERVICE_URL ?? "http://localhost:8100",
  rag: process.env.RAG_SERVICE_URL ?? "http://localhost:8300",
};

const COOKIE_NAMES: Record<keyof ServiceUrls, string> = {
  mockEnterprise: "finvoice_url_mock_enterprise",
  backend: "finvoice_url_backend",
  voice: "finvoice_url_voice",
  rag: "finvoice_url_rag",
};

/**
 * Resolves each service's base URL: a cookie set from the Settings page
 * (client-side override, e.g. pointing at a teammate's tunnel) wins,
 * falling back to the env var each Docker service is already configured
 * with (see docker-compose.yml).
 */
export async function getServiceUrls(): Promise<ServiceUrls> {
  const store = await cookies();
  const get = (key: keyof ServiceUrls) => store.get(COOKIE_NAMES[key])?.value || undefined;
  return {
    mockEnterprise: get("mockEnterprise") ?? SERVICE_DEFAULTS.mockEnterprise,
    backend: get("backend") ?? SERVICE_DEFAULTS.backend,
    voice: get("voice") ?? SERVICE_DEFAULTS.voice,
    rag: get("rag") ?? SERVICE_DEFAULTS.rag,
  };
}

export function serviceCookieName(key: keyof ServiceUrls): string {
  return COOKIE_NAMES[key];
}

export const SERVICE_LABELS: Record<keyof ServiceUrls, string> = {
  mockEnterprise: "mock-enterprise (Faz 1)",
  backend: "backend (Faz 4)",
  voice: "voice (Faz 3/5)",
  rag: "rag (Faz 6)",
};
