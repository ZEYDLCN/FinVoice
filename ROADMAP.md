# FinVoice Ops — Yol Haritası

Bu doküman, projeyi (bkz. `README.md`) uygulanabilir fazlara böler. Her faz bağımsız
olarak çalışır durumda teslim edilir; bir sonraki faz bir öncekinin üzerine inşa eder.

Durum etiketleri: ✅ Tamamlandı · 🚧 Devam ediyor · ⏳ Planlandı

---

## Faz 1 — Mock Enterprise API'ler ✅

**Hedef:** Agent'ın orkestre edeceği "gerçek" kurumsal sistemleri simüle eden,
bağımsız çalışabilen bir FastAPI servisi.

- [x] Repository iskeleti (`backend/`, `frontend/`, `voice/`, `rag/`,
      `mock-enterprise/`, `monitoring/`, `docker/`)
- [x] Customer Service — müşteri sorgulama
- [x] Policy Service — poliçe sorgulama + teminat (coverage) kontrolü
- [x] Claims Service — hasar dosyası oluşturma / sorgulama / durum güncelleme
- [x] Card Service (banking) — kart listeleme, dondurma, yeni kart talebi
- [x] Support Service — destek kaydı oluşturma / sorgulama
- [x] In-memory seed data (dokümandaki örneklerle birebir: `TR-92831`, `Zeyd Alcan`,
      `Seat Leon`, `CLM-98221` ...)
- [x] Pytest test suite
- [x] Dockerfile + docker-compose

📍 Konum: `mock-enterprise/`

---

## Faz 2 — Frontend Kabuğu ✅

**Hedef:** Sesli görüşmeyi ve agent aktivitesini izleyebileceğimiz temel arayüz.

- [x] Next.js + TypeScript + Tailwind iskeleti
- [x] Mikrofon erişimi (getUserMedia) + ses seviyesi göstergesi (`useMicrophone`)
- [x] Real-time transcript paneli (bkz. spesifikasyon §18)
- [x] Tool Activity paneli (intent, tool call log, latency, handoff context — §19)
- [x] Mock-enterprise API'lerini çağıran "text-mode" demo agent (`demoAgent.ts`) —
      5 senaryo: hasar açma, hasar durumu, teminat sorgusu, kayıp kart, human handoff
- [ ] ~~WebRTC bağlantı iskeleti~~ — bilerek ertelendi, bkz. `frontend/README.md`
      ("neden gerçek bir RTCPeerConnection yok"); Faz 3'te STT hazır olunca eklenecek.

📍 Konum: `frontend/`

---

## Faz 3 — Voice Input (VAD + STT) ⏳

**Hedef:** Kullanıcı sesini metne çeviren pipeline.

- [ ] Silero VAD entegrasyonu (konuşma başlangıcı/bitişi tespiti)
- [ ] faster-whisper ile STT servisi (lokal, self-hosted)
- [ ] Audio chunk → WAV → transcript uçtan uca akışı
- [ ] Latency ölçümü (STT latency metriği)

📍 Konum: `voice/vad/`, `voice/stt/`

---

## Faz 4 — AI Agent Orchestrator + Tool Calling ⏳

**Hedef:** Projenin kalbi — niyet anlama, eksik bilgi toplama, tool seçme/çağırma.

- [ ] LangGraph state machine (§8, §28'deki graph)
- [ ] Ollama + Qwen ile lokal LLM entegrasyonu
- [ ] Tool katmanı: `get_customer`, `get_policy`, `check_policy_coverage`,
      `create_claim`, `get_claim_status`, `freeze_card`, `request_new_card`,
      `create_support_ticket`, `transfer_to_human` (mock-enterprise API'lerini
      sarmalayan Python fonksiyonları)
- [ ] Conversation state / memory yönetimi
- [ ] Confidence skoru ve eksik alan tespiti

📍 Konum: `backend/agents/`, `backend/tools/`

---

## Faz 5 — Text-to-Speech ⏳

**Hedef:** Agent cevabını sese çevirip kullanıcıya geri oynatma.

- [ ] Piper ve/veya Kokoro TTS entegrasyonu
- [ ] TTS latency ölçümü
- [ ] Uçtan uca ses döngüsü: Mic → VAD → STT → Agent → TTS → Speaker

📍 Konum: `voice/tts/`

---

## Faz 6 — RAG (Kurumsal Doküman Arama) ⏳

**Hedef:** Yapılandırılmamış bilgi (poliçe şartları, SSS) için retrieval.

- [ ] PDF ingestion + chunking pipeline
- [ ] Sentence-Transformers embedding
- [ ] FAISS vector store (alternatif: pgvector)
- [ ] Retriever + Agent entegrasyonu (yalnızca kurumsal bilgi sorularında devreye girer)

📍 Konum: `rag/`

---

## Faz 7 — Human Handoff + Conversation Summary ⏳

**Hedef:** Agent'ın insana devretmesi gereken durumları yönetmek.

- [ ] Handoff tetikleyicileri (düşük confidence, öfkeli kullanıcı, kritik işlem,
      tool hatası, fraud şüphesi)
- [ ] Görüşme özeti üretimi (§17'deki context formatı)
- [ ] Handoff API'si (mock CRM/temsilci arayüzüne aktarım)

📍 Konum: `backend/agents/`, `backend/api/`

---

## Faz 8 — Observability + Business Dashboard ⏳

**Hedef:** Teknik ve iş metriklerinin izlenmesi.

- [ ] OpenTelemetry trace/span enstrümantasyonu (`trace_id`, `session_id`, ...)
- [ ] Prometheus metrik export (latency, tool success/error rate, session count)
- [ ] Grafana dashboard (teknik metrikler + iş metrikleri: automation rate,
      handoff rate, ortalama görüşme süresi)

📍 Konum: `monitoring/`

---

## V2 (Faz sonrası) ⏳

SIP entegrasyonu, gerçek telefon görüşmeleri, multi-agent architecture,
sentiment analysis, speaker diarization, fraud detection, voice biometrics,
çoklu dil desteği, call recording, supervisor dashboard, dynamic workflow
builder. (bkz. spesifikasyon §33)
