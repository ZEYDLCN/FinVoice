# FinVoice Ops

**Bankacılık ve Sigorta Operasyonları için Gerçek Zamanlı Voice AI Automation
Platformu**

FinVoice Ops, banka ve sigorta ekiplerinin müşteri operasyonlarını
otomatikleştirmek için tasarlanmış, gerçek zamanlı sesli yapay zekâ
platformudur. Klasik bir chatbot değildir: kullanıcıdan gelen sesli talepleri
anlar, gerekli kurumsal API'leri çağırır, dokümanlardan bilgi getirir, işlem
gerçekleştirir, gerektiğinde müşteri temsilcisine aktarır ve tüm sürecin
performansını ölçer.

```text
User → Voice → STT → AI Agent → Reasoning → Tool Calling
     → Enterprise API → Action → Result → TTS → User
```

## Neden bu proje?

Banka/sigorta müşteri operasyonlarının (hasar açma, poliçe sorgulama, kart
dondurma, destek kaydı vb.) büyük bölümü hâlâ manuel yürütülüyor ve
temsilcinin birden fazla sistemi aynı anda kullanmasını gerektiriyor. FinVoice
Ops bu süreci; Voice AI, STT, TTS, LLM, RAG, tool calling, API orchestration
ve gerçek zamanlı web teknolojilerini tek bir uçtan uca projede birleştirerek
otomatikleştirir.

## Mimari (hedef)

```text
Mic → WebRTC → Silero VAD → faster-whisper (STT)
    → LangGraph Agent Orchestrator ──┬── RAG (poliçe dokümanları)
                                      ├── Tool Calls → Enterprise API'ler
                                      └── Memory / Session
    → Ollama/Qwen (LLM) → Piper/Kokoro (TTS) → User Audio
```

Tüm modüller, güvenlik, gözlemlenebilirlik ve iş metrikleri hakkındaki tam
teknik spesifikasyon için proje geçmişindeki orijinal tasarım dokümanına
bakılabilir; bu README güncel durumu ve nasıl çalıştırılacağını özetler.

## Durum: Faz 6 tamamlandı ✅

Proje **fazlara bölünerek** geliştiriliyor — tam plan için **[`ROADMAP.md`](./ROADMAP.md)**.

| Faz | Kapsam | Durum |
|-----|--------|-------|
| 1 | Mock Enterprise API (Customer/Policy/Claims/Card/Support) | ✅ |
| 2 | Frontend kabuğu (Next.js + mikrofon + transcript/tool activity paneli) | ✅ |
| 3 | Voice input (Silero VAD + faster-whisper, torch'suz) | ✅ |
| 4 | AI Agent Orchestrator (LangGraph + Ollama + Tool Calling) | ✅ |
| 5 | Text-to-Speech (Piper, torch'suz) | ✅ |
| 6 | RAG (poliçe dokümanları, FAISS + TF-IDF, torch'suz) | ✅ |
| 7 | Human handoff + conversation summary | ⏳ |
| 8 | Observability + business dashboard (Prometheus/Grafana) | ⏳ |

## Repository yapısı

```text
FinVoice/
├── mock-enterprise/   # Faz 1 — sahte Customer/Policy/Claims/Card/Support API'leri (FastAPI)
├── backend/           # Faz 4 (tamamlandı) — LangGraph agent, tools, api
├── frontend/          # Faz 2 — Next.js Voice Console (transcript, tool activity, mikrofon)
├── voice/             # Faz 3 (VAD+STT, tamamlandı) & Faz 5 (TTS) — bkz. voice/README.md
├── rag/               # Faz 6 (tamamlandı) — PDF ingestion, TF-IDF+FAISS retrieval
├── monitoring/        # Faz 8 — Prometheus, Grafana
├── docker/            # Servis-özel Docker dosyaları
├── docker-compose.yml
└── ROADMAP.md
```

## Hızlı Başlangıç (Faz 1 — Mock Enterprise API)

```bash
cd mock-enterprise
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

Örnek çağrı:

```bash
curl http://localhost:8000/api/policies/TR-92831
```

```json
{
  "policyNumber": "TR-92831",
  "customerId": "CUST-001",
  "customer": "Zeyd Alcan",
  "status": "ACTIVE",
  "vehicle": "Seat Leon",
  "coverage": "FULL_CASCO",
  "coveredItems": ["collision", "theft", "fire", "towing", "glass"],
  "startDate": "2026-01-01",
  "endDate": "2026-12-31"
}
```

Hasar dosyası oluşturma:

```bash
curl -X POST http://localhost:8000/api/claims \
  -H "Content-Type: application/json" \
  -d '{"policyNumber":"TR-92831","accidentDate":"2026-09-10","location":"Istanbul","description":"Rear collision"}'
```

```json
{ "claimId": "CLM-98221", "status": "OPEN", ... }
```

Docker ile:

```bash
docker compose up --build mock-enterprise
```

Testler:

```bash
cd mock-enterprise && pytest
```

Detaylı endpoint listesi için [`mock-enterprise/README.md`](./mock-enterprise/README.md).

## Hızlı Başlangıç (Faz 2 — Voice Console)

`mock-enterprise` çalışırken (yukarıdaki adım), başka bir terminalde:

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

http://localhost:3000 adresinde transcript paneli, tool activity paneli ve
mikrofon göstergesini içeren konsolu açın; örnek komutlardan birine tıklayıp
gerçek mock-enterprise API çağrılarının uçtan uca çalıştığını görün (ör.
"Arabamla kaza yaptım, hasar dosyası açtırmak istiyorum." → poliçe kontrolü →
tarih/konum soruları → `CLM-98221` dosya numarası).

Bu fazdaki agent, gerçek bir LLM değil; Faz 4'te LangGraph ile değişecek
basit bir "scripted demo agent"dır — detay için
[`frontend/README.md`](./frontend/README.md).

## Hızlı Başlangıç (Faz 3 — Voice Gateway: VAD + STT)

```bash
cd FinVoice   # repo kökü
python -m venv voice/.venv && source voice/.venv/bin/activate
pip install -r voice/requirements.txt
uvicorn voice.service.app:app --reload --port 8100
```

```bash
curl -X POST http://localhost:8100/v1/transcribe -F "file=@ornek.wav"
```

Silero VAD konuşmayı algılar, sessizliği kırpar, ardından faster-whisper
metne çevirir; yanıt VAD/STT/toplam gecikmeyi de içerir. Torch bağımlılığı
yoktur — detay ve ortam değişkenleri için
[`voice/README.md`](./voice/README.md).

## Hızlı Başlangıç (Faz 4 — Agent Orchestrator: LangGraph + Ollama)

```bash
# Ollama kurulu ve çalışır olmalı: ollama pull qwen2.5:7b && ollama serve
cd FinVoice
python -m venv backend/.venv && source backend/.venv/bin/activate
pip install -r backend/requirements.txt
MOCK_ENTERPRISE_URL=http://localhost:8000 uvicorn backend.api.app:app --reload --port 8200
```

```bash
curl -X POST http://localhost:8200/v1/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"s1","text":"Arabamla kaza yaptım, hasar dosyası açtırmak istiyorum."}'
```

Bu, Faz 2'deki scripted `demoAgent.ts`'in yerini alacak **gerçek** LangGraph
tool-calling agent'ıdır — aynı `{reply, toolCalls, handoff}` sözleşmesini
kullanır. Ollama kurulu değilse `FINVOICE_AGENT_LLM_BACKEND=fake` ile
API'yi (gerçek muhakeme olmadan) yine de ayağa kaldırıp test edebilirsiniz —
detay için [`backend/README.md`](./backend/README.md).

## Hızlı Başlangıç (Faz 5 — Text-to-Speech)

`voice/` servisi zaten çalışıyorsa (Faz 3 bölümüne bakın), aynı servis
artık `/v1/synthesize`'ı da sunuyor:

```bash
curl -X POST http://localhost:8100/v1/synthesize \
  -H "Content-Type: application/json" \
  -d '{"text":"Hasar kaydınız oluşturuldu. Dosya numaranız CLM-98221."}' \
  -o cevap.wav
```

Piper ile gerçek, self-hosted (torch'suz) ses üretimi. Bir ses modeli
indirmediyseniz `FINVOICE_VOICE_TTS_BACKEND=fake` ile sessiz bir WAV
döner — model indirme talimatları için
[`voice/tts/models/README.md`](./voice/tts/models/README.md).

## Hızlı Başlangıç (Faz 6 — RAG: Kurumsal Doküman Arama)

```bash
cd FinVoice
python -m venv rag/.venv && source rag/.venv/bin/activate
pip install -r rag/requirements.txt
uvicorn rag.service.app:app --reload --port 8300
```

```bash
curl -X POST http://localhost:8300/v1/search \
  -H "Content-Type: application/json" \
  -d '{"query":"İkame araç kaç gün sağlanır?"}'
```

Poliçe/kart dokümanlarını (`rag/documents/*.pdf`) FAISS ile indeksleyip
ilgili metin parçalarını döner — `backend/`'deki agent bunu
`search_policy_documents` tool'u ile kullanır. Varsayılan embedding TF-IDF'tir
(torch/HF indirmesi yok); gerekçe için [`rag/README.md`](./rag/README.md).

## Teknoloji Stack (hedef)

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js, React, TypeScript, WebRTC, Tailwind |
| Backend | Python, FastAPI, Pydantic |
| AI Agent | LangGraph, Ollama, Qwen |
| Speech | faster-whisper, Silero VAD, Piper/Kokoro |
| RAG | FAISS, Sentence Transformers |
| Database | PostgreSQL, Redis |
| Monitoring | Prometheus, Grafana, OpenTelemetry |
| Container | Docker, Docker Compose |

Tüm bileşenler ücretsiz/open-source çalışacak şekilde seçildi; ticari AI API
maliyeti gerektirmez.
