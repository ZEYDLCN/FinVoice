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

## Faz 3 — Voice Input (VAD + STT) ✅

**Hedef:** Kullanıcı sesini metne çeviren pipeline.

- [x] Silero VAD entegrasyonu (konuşma başlangıcı/bitişi tespiti) — torch
      bağımlılığı olmadan, saf onnxruntime ile (bkz. `voice/README.md`)
- [x] faster-whisper ile STT servisi (lokal, self-hosted, CTranslate2 — torch yok)
- [x] Herhangi bir formatı (wav/webm/ogg/...) 16kHz mono'ya çeviren `audio_utils.py`
- [x] FastAPI servisi: `POST /v1/transcribe` — VAD ile sessizliği kırpıp yalnızca
      konuşma varsa STT çalıştırıyor
- [x] Latency ölçümü (`vadLatencyMs`, `sttLatencyMs`, `totalLatencyMs`)
- [x] Gerçek Silero VAD ile test edildi (espeak-ng ile üretilmiş sentetik
      konuşma + sessizlik fixture'ları); gerçek faster-whisper testi
      (`-m slow`) internet erişimi gerektirdiği için ortama göre çalışır —
      bkz. `voice/README.md`

📍 Konum: `voice/`

---

## Faz 4 — AI Agent Orchestrator + Tool Calling ✅

**Hedef:** Projenin kalbi — niyet anlama, eksik bilgi toplama, tool seçme/çağırma.

- [x] LangGraph state machine (§8, §28'deki graph — `agent ⇄ tools` döngüsü,
      `transfer_to_human` özel çıkış yolu ile)
- [x] Ollama + Qwen ile lokal LLM entegrasyonu (`langchain-ollama` ile,
      torch bağımlılığı yok) — kod tamamlandı, `ScriptedChatModel` ile
      uçtan uca test edildi; gerçek Qwen çağrısı bu sandbox'ta doğrulanamadı
      çünkü ortamın ağ politikası `ollama.com`'u engelliyor (Faz 3'teki
      `huggingface.co` engeliyle aynı kategori) — bkz. `backend/README.md`
- [x] Tool katmanı: `get_customer`, `get_policy`, `check_policy_coverage`,
      `create_claim`, `get_claim_status`, `freeze_card`, `request_new_card`,
      `create_support_ticket`, `transfer_to_human` + bonus `get_cards`
      (mock-enterprise API'lerini sarmalayan async Python fonksiyonları)
- [x] Conversation state / memory yönetimi — kendi yazdığımız bir store
      değil, LangGraph'ın `MemorySaver` checkpointer'ı (`thread_id` = session)
- [~] Confidence skoru ve eksik alan tespiti — **bilinçli olarak
      farklı çözüldü**: gerçek bir LLM'in "eksik alan" listesi çıkarıp
      hardcoded bir confidence sayısı üretmesi yerine, model eksik bilgiyi
      doğal dilde soru sorarak kendi ele alıyor (bu, Faz 2'nin scripted
      state machine'inin yapamadığı, gerçek reasoning'in asıl faydası).
      Sayısal bir confidence skoru Ollama'nın chat API'sinden native olarak
      gelmiyor; eklenmedi.

📍 Konum: `backend/`

---

## Faz 5 — Text-to-Speech ✅

**Hedef:** Agent cevabını sese çevirip kullanıcıya geri oynatma.

- [x] Piper TTS entegrasyonu (torch'suz — kendi espeak-ng phonemizer'ı ve
      onnxruntime vocoder'ıyla). Kokoro eklenmedi; Piper'ın bu sandbox'ta
      gerçekten indirilip çalıştırılabilir olması (Hugging Face'in aksine
      GitHub release'leri erişilebilirdi) net bir kazanım sağladı —
      detay ve gerekçe için `voice/README.md`
- [x] TTS latency ölçümü (`X-TTS-Latency-Ms`, `X-TTS-Duration-S` header'ları)
- [x] `POST /v1/synthesize` gerçek bir ses modeliyle uçtan uca test edildi —
      bu sandbox'ta canlı bir sunucu üzerinden gerçek İngilizce konuşma
      üretildi ve doğrulandı (Faz 3/4'ün aksine burada indirme engellenmedi)
- [ ] ~~Uçtan uca ses döngüsü: Mic → VAD → STT → Agent → TTS → Speaker~~ —
      her bir halka (Faz 1-5) ayrı ayrı çalışır ve test edilmiş durumda;
      bunları birbirine bağlayan orkestrasyon kablolaması henüz yapılmadı
      (bkz. `voice/README.md` "Frontend / Agent entegrasyonu")

📍 Konum: `voice/tts/`

---

## Faz 6 — RAG (Kurumsal Doküman Arama) ✅

**Hedef:** Yapılandırılmamış bilgi (poliçe şartları, SSS) için retrieval.

- [x] PDF ingestion + chunking pipeline (başlık/soru tabanlı sezgisel chunker)
- [~] Embedding: **Sentence-Transformers yerine karakter n-gram TF-IDF**
      (bilinçli karar — torch ve Hugging Face indirmesi gerektirmiyor,
      Türkçe eklemeli yapıya n-gram'larla stemmer'sız çözüm; gerekçe için
      `rag/README.md`). Sentence-Transformers de gerçek, çalışan opsiyonel
      bir backend olarak mevcut (`FINVOICE_RAG_EMBEDDING_BACKEND=sentence-transformers`).
- [x] FAISS vector store (gerçek FAISS, pgvector'a gerek kalmadı — bu
      ölçekte flat index yeterli)
- [x] Retriever + Agent entegrasyonu: `search_policy_documents` tool'u
      backend/'in Faz 4 agent'ına eklendi; agent basit teminat sorularında
      `check_policy_coverage`'ı, sözleşme metni gerektiren sorularda RAG'i
      kullanacak şekilde yönlendirildi (spec §13-15)
- [x] Uçtan uca gerçek test: 3 örnek PDF (kasko, kart, SSS — sentetik ama
      gerçek Türkçe içerikli) gerçek şekilde indekslendi ve gerçek Türkçe
      sorgularla doğrulandı — **bu fazın testleri hiçbir sahte/fake
      gerektirmiyor**, tamamı gerçek kod yolundan geçiyor (Faz 3-5'in
      aksine model indirme engeli yok)

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
