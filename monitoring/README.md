# monitoring — Faz 8: Observability + Business Dashboard

Prometheus metrikleri (teknik + iş) ve bunları görselleştiren bir Grafana
dashboard'u (dashboard-as-code, JSON olarak repoda). OpenTelemetry tracing
`backend/`'de enstrümante edildi (bkz. `backend/observability/tracing.py`).

## Mimari

```text
mock-enterprise ─┐
voice           ─┼─ /metrics (Prometheus formatı) ──► Prometheus ──► Grafana
backend         ─┤                                        │
rag             ─┘                                        └─ dashboard: monitoring/grafana/dashboards/finvoice-ops.json
```

Her Python servisi `prometheus-fastapi-instrumentator` ile genel HTTP
metriklerini (`http_requests_total`, latency) otomatik olarak `/metrics`'te
sunar. `backend/` ve `voice/` ayrıca iş/domain'e özgü metrikler ekler —
bir "200 OK" size bir hasar dosyasının gerçekten oluşup oluşmadığını
söylemez.

## Metrikler

### `backend/` (`backend/observability/metrics.py`)

| Metrik | Tip | Etiketler | Açıklama |
|--------|-----|-----------|----------|
| `finvoice_chat_turns_total` | Counter | — | İşlenen `/v1/chat` turu sayısı |
| `finvoice_chat_latency_seconds` | Histogram | — | Bir turun toplam süresi |
| `finvoice_tool_calls_total` | Counter | `tool`, `status` | Tool çağrısı sayısı |
| `finvoice_tool_call_duration_seconds` | Histogram | `tool` | Tool çağrısı süresi |
| `finvoice_handoff_total` | Counter | `trigger` (`guardrail`\|`llm`) | Human handoff sayısı |
| `finvoice_active_sessions` | Gauge | — | Görülen benzersiz session sayısı |

### `voice/` (`voice/service/metrics.py`)

| Metrik | Tip | Açıklama |
|--------|-----|----------|
| `finvoice_voice_vad_latency_seconds` | Histogram | Silero VAD süresi |
| `finvoice_voice_stt_latency_seconds` | Histogram | faster-whisper süresi |
| `finvoice_voice_tts_latency_seconds` | Histogram | Piper süresi |
| `finvoice_voice_transcriptions_total` | Counter | `speech_detected` etiketiyle |

## OpenTelemetry Tracing (`backend/observability/tracing.py`)

Her tool çağrısı gerçek bir OTel span'i olarak kaydediliyor
(`tool.<isim>`), `tool.status` ve `tool.duration_ms` attribute'larıyla; her
chat turu bir `chat_turn` root span'i içinde çalışıyor (`session_id`,
`handoff.trigger`, `handoff.reason` attribute'ları ile). Varsayılan olarak
konsola (`ConsoleSpanExporter`) basılır — sıfır ek altyapıyla görülebilir/
doğrulanabilir olsun diye. Gerçek bir collector'a (Jaeger, Tempo) göndermek
için:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4318
```

## Çalıştırma

```bash
docker compose up -d prometheus grafana
```

Prometheus: http://localhost:9090
Grafana: http://localhost:3001 (anonim erişim açık — demo amaçlı; üretimde
kapatın)

Grafana ilk açılışta `provisioning/` altındaki datasource'u ve
`dashboards/finvoice-ops.json`'ı otomatik yükler — elle bir şey eklemenize
gerek yok.

## Bu sandbox'ta neyi doğrulayabildim, neyi doğrulayamadım

Bu proje geliştirilirken **Docker Hub'a erişim bu ortamın ağ
politikasınca engellendi** (`docker build` bir `python:3.12-slim` katmanını
bile çekemedi — `403 Forbidden`) ve `grafana.com`/`dl.grafana.com` da
engelliydi (Grafana'nın resmi ikili dosyaları yalnızca oradan dağıtılıyor,
GitHub release asset'i olarak yok). Bu, projenin diğer fazlarında
`huggingface.co`/`ollama.com` için gördüğümüz kısıtlamayla aynı kategori —
bu sefer container registry'lerine ve Grafana'nın kendi CDN'ine uzanıyor.

Bu yüzden **gerçek bir Grafana ekran görüntüsü alamadım**. Ama bunun
yerine:

- ✅ **Gerçek Prometheus'u** (GitHub release'inden indirilen resmi ikili
  dosya — engellenmedi) bu makinede çalıştırdım.
- ✅ **mock-enterprise, voice, backend, rag'ı gerçek süreçler olarak**
  ayağa kaldırıp gerçek trafik gönderdim (chat turları, guardrail
  tetiklemeli handoff'lar, RAG sorguları, TTS istekleri).
- ✅ Prometheus'un **her 4 servisi de gerçekten scrape ettiğini** doğruladım
  (`/api/v1/targets` → hepsi `health: up`).
- ✅ **`finvoice-ops.json` dashboard'undaki HER PromQL sorgusunu**,
  Prometheus'un gerçek `/api/v1/query` API'sine göndererek doğruladım —
  sonuçlar gerçek, gönderdiğim trafikle birebir eşleşiyor (ör. 7 chat
  turundan 2'si handoff → automation rate gerçekten %71.43, handoff rate
  gerçekten %28.57 döndü). Bu, dashboard'un Grafana'da doğru render
  edileceğinin güçlü bir kanıtı — Grafana sadece bu sorguları çalıştırıp
  çiziyor.
- ❌ **Gerçek bir Grafana ekranı** bu sandbox'ta render edilemedi (ikili
  dosyaya erişim engelli). `docker compose up grafana` normal bir
  makinede/CI'da çalışması beklenir; dashboard JSON'ı standart
  "dashboard-as-code" formatında ve yukarıdaki gibi sorgu bazında doğrulandı.

## Business Metrics → Grafana panelleri eşlemesi (spec §21)

| Spec metriği | Panel | PromQL (özet) |
|---|---|---|
| Calls Today | "Toplam Chat Turu" | `sum(finvoice_chat_turns_total)` |
| Automation Rate | "Automation Rate" | `1 - handoff/turns` |
| Human Handoff | "Human Handoff Rate" | `handoff/turns` |
| Average AI Response | "Chat Turn Latency (p50/p95)" | `histogram_quantile(finvoice_chat_latency_seconds)` |
| Claim Creation Success | "Tool Call Rate" (tool=create_claim) | `finvoice_tool_calls_total{tool="create_claim"}` |
| Average Call Duration | — | Uygulanmadı: bu sistemde telefon çağrısı yok, bir "call" bir `/v1/chat` turu; süre zaten latency panelinde |

## Dizin yapısı

```text
monitoring/
├── prometheus/
│   └── prometheus.yml
└── grafana/
    ├── provisioning/
    │   ├── datasources/datasources.yml
    │   └── dashboards/dashboards.yml
    └── dashboards/
        └── finvoice-ops.json
```
