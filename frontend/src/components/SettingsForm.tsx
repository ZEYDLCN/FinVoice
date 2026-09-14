"use client";

import { useState } from "react";
import { RotateCcw, Save } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import type { ServiceUrls } from "@/lib/serviceConfig";

const COOKIE_NAMES: Record<keyof ServiceUrls, string> = {
  mockEnterprise: "finvoice_url_mock_enterprise",
  backend: "finvoice_url_backend",
  voice: "finvoice_url_voice",
  rag: "finvoice_url_rag",
};

const LABELS: Record<keyof ServiceUrls, string> = {
  mockEnterprise: "mock-enterprise (Faz 1)",
  backend: "backend (Faz 4)",
  voice: "voice (Faz 3/5)",
  rag: "rag (Faz 6)",
};

function setCookie(name: string, value: string) {
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${oneYear}`;
}

function clearCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}

export function SettingsForm({
  initial,
  defaults,
}: {
  initial: ServiceUrls;
  defaults: ServiceUrls;
}) {
  const [values, setValues] = useState<ServiceUrls>(initial);
  const [saved, setSaved] = useState(false);

  const save = () => {
    (Object.keys(values) as (keyof ServiceUrls)[]).forEach((key) => {
      setCookie(COOKIE_NAMES[key], values[key]);
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => {
    (Object.keys(defaults) as (keyof ServiceUrls)[]).forEach((key) => clearCookie(COOKIE_NAMES[key]));
    setValues(defaults);
  };

  return (
    <Card>
      <CardHeader
        title="Servis Adresleri"
        description="Varsayılanlar docker-compose.yml'deki servis adlarını/portlarını kullanır. Farklı bir ortama (ör. tünellenmiş uzak bir servis) işaret etmek için değiştirebilirsiniz — tarayıcıya bir cookie olarak kaydedilir."
      />
      <div className="space-y-4">
        {(Object.keys(values) as (keyof ServiceUrls)[]).map((key) => (
          <TextField
            key={key}
            label={LABELS[key]}
            value={values[key]}
            onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
            placeholder={defaults[key]}
          />
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2">
        <Button onClick={save}>
          <Save className="h-4 w-4" />
          Kaydet
        </Button>
        <Button variant="secondary" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
          Varsayılanlara Dön
        </Button>
        {saved && <span className="text-xs text-[var(--success)]">Kaydedildi</span>}
      </div>
    </Card>
  );
}
