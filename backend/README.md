# backend — Faz 4: Agent Orchestrator (LangGraph + Ollama)

Gerçek bir LLM'in tool-calling yaparak mock-enterprise (Faz 1) API'lerini
çağırdığı orkestratör. Faz 2'deki `frontend/src/lib/demoAgent.ts` scripted
state machine'inin yerini alan **gerçek akıl yürütme katmanı** budur — API
sözleşmesi (`{reply, toolCalls, handoff}`) bilerek aynı tutuldu ki
frontend'in ileride buna geçişi küçük bir değişiklik olsun.

```text
POST /v1/chat {sessionId, text}
        │
        ▼
   LangGraph: agent ⇄ tools  (LLM tool-calling döngüsü)
        │                │
        │                ├── mock-enterprise API'leri (Faz 1) — yapılandırılmış veri
        │                └── RAG servisi (Faz 6) — poliçe dokümanları, yapılandırılmamış sorular
        ▼
   {reply, toolCalls, handoff}
```

## Faz 2'nin scripted agent'ından farkı

| | Faz 2 `demoAgent.ts` | Faz 4 `backend/` |
|---|---|---|
| Niyet anlama | anahtar kelime/regex | gerçek LLM (Qwen, Ollama üzerinden) |
| Eksik bilgi | hardcoded "hangi slot eksik" mantığı | model kendi karar verir, düz metinle sorar |
| Tool seçimi | if/switch | model, tool JSON şemalarına bakıp seçer |
| Conversation memory | elle yazılmış `sessionStore.ts` | LangGraph'ın kendi checkpointer'ı (`MemorySaver`) |
| Test edilebilirlik | zaten deterministik | `ScriptedChatModel` ile LLM'siz test |

## Mimari kararlar

- **Torch/ağır bağımlılık yok**: `langgraph` + `langchain-core` +
  `langchain-ollama` kullanılıyor (hepsi hafif, torch gerektirmiyor —
  Faz 3'teki "torch'suz kalalım" prensibiyle tutarlı).
- **Tool katmanı** (`tools/`), `frontend/src/lib/mockApi.ts`'in Python
  karşılığı: mock-enterprise'ı saran ince, async fonksiyonlar. Her biri
  `@tool` dekoratörüyle işaretlenmiş — docstring'ler LLM'e giden tool
  açıklamaları, tip ipuçları JSON şemasına dönüşüyor.
- **`transfer_to_human` bir tool'dur**, agents/graph.py'de özel olarak ele
  alınır: model bunu çağırdığında graph tekrar modele dönmeden turu bitirir
  (spec §16-17).
- **Session/conversation memory** kendi yazdığımız bir store değil,
  LangGraph'ın `MemorySaver` checkpointer'ı — `thread_id` (= `sessionId`)
  başına otomatik biriktiriliyor. Faz 2/3'teki elle yazılmış
  process-in-memory store'ların aksine, framework'ün kendi mekanizması.
- **Tool-call logu ve handoff bilgisi** graph state'inin bir parçası
  DEĞİL — her istekte taze bir liste/dict, `config["configurable"]` üzerinden
  side-channel olarak geçiliyor (bkz. `agents/graph.py`). Böylece
  checkpoint'e "bu turda hangi tool'lar çalıştı" gibi geçici bilgi sızmıyor.

## Ollama kurulumu (gerçek LLM için)

```bash
# ollama.com'dan kurun, sonra:
ollama pull qwen2.5:7b
ollama serve   # varsayılan: http://localhost:11434
```

```bash
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

## `FINVOICE_AGENT_LLM_BACKEND=fake` — Ollama olmadan smoke-test

Ollama kurulu/çalışır değilse servis yine ayağa kalkar ve sabit bir metinle
cevap verir (hiç tool çağırmadan) — API'nin, tool kaydının ve handoff
şemasının çalıştığını Ollama olmadan da doğrulamak için:

```bash
FINVOICE_AGENT_LLM_BACKEND=fake uvicorn backend.api.app:app --port 8200
curl -X POST http://localhost:8200/v1/chat -d '{"sessionId":"s1","text":"merhaba"}'
# {"reply":"Şu anda gerçek bir dil modeline bağlı değilim ...","toolCalls":[],"handoff":null}
```

Bu, gerçek muhakeme YAPMAZ — sadece "servis ayakta, sözleşme doğru" der.

## Bu sandbox'ta neyi doğrulayabildim, neyi doğrulayamadım

Bu proje bir agent sandbox'ında geliştirildi ve `ollama.com` /
`registry.ollama.ai` bu ortamın ağ politikasınca engellendi (Faz 3'te
`huggingface.co`'nun engellenmesiyle aynı kategori kısıtlama). Bu yüzden:

- ✅ **Gerçek LangGraph graph'ı, gerçek tool-calling döngüsü, gerçek
  mock-enterprise çağrıları** — `ScriptedChatModel` ile (LLM'i taklit eden,
  ama tool'ları GERÇEKTEN çalıştıran bir test aracı) uçtan uca test edildi:
  tek tool çağrısı, çok adımlı hasar dosyası açma senaryosu, tool hatası,
  human handoff, ve `thread_id` bazlı memory persistence — hepsi gerçek
  kod yolundan geçti (bkz. `tests/test_graph_scripted.py`).
- ✅ **Gerçek FastAPI servisi** `uvicorn` ile ayağa kaldırıldı ve
  `FINVOICE_AGENT_LLM_BACKEND=fake` ile canlı `curl` isteğiyle doğrulandı.
- ❌ **Gerçek Qwen/Ollama çağrısı** bu sandbox'ta doğrulanamadı (ağ engeli).
  Kod doğru ve standart `langchain_ollama.ChatOllama` entegrasyonunu
  kullanıyor; normal bir geliştirme makinesinde/CI'da Ollama kuruluyken
  çalışması beklenir.

## Testler

```bash
cd FinVoice
source backend/.venv/bin/activate
pytest backend/
```

Hiçbir test gerçek bir LLM ya da gerçek mock-enterprise servisi gerektirmez:
LLM çağrıları `ScriptedChatModel` ile, mock-enterprise çağrıları `respx` ile
sahtelenir (bkz. `tests/conftest.py`). `-m slow` işaretli bir test yok —
Faz 3'ün aksine, gerçek Ollama entegrasyonunu bu repoda otomatik test etmek
pratik değil (yerel bir model + sunucu gerektirir); bunun yerine
`FINVOICE_AGENT_LLM_BACKEND=fake` ile manuel smoke-test önerilir (yukarıya
bakın).

## Dizin yapısı

```text
backend/
├── agents/
│   ├── graph.py       # LangGraph StateGraph: agent ⇄ tools döngüsü
│   └── prompts.py     # sistem promptu
├── tools/
│   ├── mock_client.py     # mock-enterprise'a async HTTP çağrıları
│   ├── rag_client.py       # RAG servisine (Faz 6) async HTTP çağrıları
│   ├── customer_tools.py, policy_tools.py, claims_tools.py,
│   │   card_tools.py, support_tools.py, handoff_tools.py, rag_tools.py
│   └── registry.py        # ALL_TOOLS / TOOLS_BY_NAME
├── llm/
│   ├── factory.py     # get_chat_model() — ChatOllama ya da fake
│   └── fake.py         # ScriptedChatModel (test), StaticReplyChatModel (fake backend)
├── api/
│   ├── app.py          # FastAPI: POST /v1/chat
│   ├── schemas.py
│   └── config.py
└── tests/
    ├── conftest.py           # respx ile mock-enterprise sahteleme
    ├── test_tools.py
    ├── test_graph_scripted.py
    └── test_api.py
```

## Ortam değişkenleri

| Değişken | Varsayılan | Açıklama |
|----------|------------|----------|
| `MOCK_ENTERPRISE_URL` | `http://localhost:8000` | Faz 1 API adresi |
| `RAG_SERVICE_URL` | `http://localhost:8300` | Faz 6 RAG servisi adresi |
| `FINVOICE_AGENT_LLM_BACKEND` | `ollama` | `fake` → Ollama olmadan smoke-test |
| `FINVOICE_AGENT_OLLAMA_HOST` | `http://localhost:11434` | Ollama sunucu adresi |
| `FINVOICE_AGENT_AGENT_MODEL` | `qwen2.5:7b` | Ollama model adı |
| `FINVOICE_AGENT_AGENT_TEMPERATURE` | `0.2` | LLM sampling sıcaklığı |

## Sıradaki adım (frontend entegrasyonu)

`frontend/src/app/api/agent/message/route.ts` şu an `demoAgent.ts`'i
çağırıyor. Bu servis hazır olduğunda route, `AGENT_BACKEND_URL` ayarlıysa
`POST /v1/chat`'e proxy yapacak şekilde güncellenebilir — yanıt şeması
(`reply`/`toolCalls`/`handoff`) zaten uyumlu tasarlandı.
