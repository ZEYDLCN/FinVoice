# frontend — Faz 2: Voice Console (metin modu)

Next.js (App Router) + TypeScript + Tailwind ile FinVoice Ops'un uçtan uca
demo arayüzü. Gerçek zamanlı transcript paneli, tool activity paneli ve
mikrofon erişimini içerir; **ses işleme boru hattı henüz bağlı değildir**
(bkz. aşağıdaki kapsam notu).

## Neden "text-mode"?

`ROADMAP.md`'deki Faz sırası: önce API'ler (Faz 1), sonra frontend kabuğu
(Faz 2), sonra ses girişi (Faz 3) ve ancak ondan sonra gerçek LLM agent
(Faz 4). Faz 2'de henüz ne STT ne de LangGraph agent vardır. Bu nedenle bu
fazda iki şey inşa edildi:

1. **Gerçek altyapı:** mikrofon izni + ses seviyesi ölçümü (`useMicrophone`),
   transcript paneli, tool activity paneli — bunlar Faz 3/4'te olduğu gibi
   kalacak.
2. **Geçici bir "scripted demo agent"** (`src/lib/demoAgent.ts`): LLM
   kullanmayan, anahtar kelime/regex tabanlı basit bir state machine. Amacı
   sahte akıl yürütme yapmak değil — Faz 4'te gelecek gerçek LangGraph
   agent'ının oturacağı **plumbing'i** (API route → tool call → mock-enterprise
   → UI'da transcript + tool activity) şimdiden gerçek ve çalışır halde
   kanıtlamaktır. `handleTurn(state, text)` imzası, LangGraph agent'ı ile
   değiştirilebilecek şekilde tasarlandı; API route'lar ve UI bileşenleri
   değişmeyecek.

Bu ayrım kodda da açık: `src/lib/demoAgent.ts` dosyasının başındaki yorum
bunu belirtir.

## Desteklenen senaryolar (spec §34)

| # | Senaryo | Örnek giriş |
|---|---------|--------------|
| 1 | Hasar dosyası oluşturma | "Arabamla kaza yaptım, hasar dosyası açtırmak istiyorum." |
| 2 | Hasar durumu sorgulama | "Hasar dosyamın durumunu öğrenmek istiyorum." |
| 3 | Poliçe teminat sorgusu | "Kaskom çekici hizmetini kapsıyor mu?" |
| 4 | Kayıp kart bildirimi | "Kartımı kaybettim." |
| 5 | Human handoff | "Bir temsilciyle görüşmek istiyorum." (veya niyet 2 denemede anlaşılamazsa otomatik) |

Demo müşterisi: `CUST-001` (Zeyd Alcan), poliçesi `TR-92831`, kartı
`CARD-9001` — bkz. `mock-enterprise/README.md`.

## Mimari notu: neden gerçek bir WebRTC/RTCPeerConnection yok?

`useMicrophone` hook'u `getUserMedia` ile mikrofona erişip Web Audio API
üzerinden ses seviyesini ölçüyor — bu WebRTC'nin medya yakalama katmanı.
Bilerek bir `RTCPeerConnection` **kurulmuyor**: şu an sesin gideceği bir STT
backend'i yok, boşa akan bir bağlantı kurmak yerine Faz 3'te faster-whisper
servisi hazır olduğunda bu hook'un üzerine gerçek streaming eklenecek.

## Çalıştırma

Önce `mock-enterprise` servisinin ayakta olması gerekir (bkz. kök `README.md`).

```bash
cd frontend
npm install
cp .env.example .env.local   # MOCK_ENTERPRISE_URL'i gerekirse düzenleyin
npm run dev
```

http://localhost:3000 açın. Örnek komutlardan birine tıklayın ya da kendi
cümlenizi yazın.

## Komutlar

```bash
npm run dev      # geliştirme sunucusu
npm run build    # production build (+ TypeScript kontrolü)
npm run start    # production sunucu
npm run lint     # ESLint
```

## Dizin yapısı

```text
src/
├── app/
│   ├── page.tsx                  # Ana Voice Console sayfası
│   ├── layout.tsx
│   └── api/agent/
│       ├── message/route.ts      # POST { sessionId, text } -> AgentTurnResponse
│       └── reset/route.ts        # POST { sessionId } -> { ok: true }
├── components/
│   ├── MicVisualizer.tsx         # mikrofon izni + ses seviyesi çubukları
│   ├── TranscriptPanel.tsx       # gerçek zamanlı transcript
│   ├── ToolActivityPanel.tsx     # intent + tool call log + handoff context
│   └── ChatConsole.tsx           # metin girişi + örnek komutlar
├── hooks/
│   └── useMicrophone.ts
└── lib/
    ├── types.ts                  # paylaşılan tipler (client + server)
    ├── mockApi.ts                # mock-enterprise REST client + tool-call timing
    ├── demoAgent.ts              # Faz 2 scripted agent (bkz. yukarıdaki not)
    └── sessionStore.ts           # process-in-memory conversation state
```

## Bilinen sınırlamalar (bilerek)

- **Session store process-in-memory'dir** — yalnızca tek instance'ta çalışır,
  yeniden başlatınca sıfırlanır. Faz 4'te gerçek memory/session yönetimi ile
  değişecek.
- **NLU yok** — `demoAgent.ts` basit anahtar kelime eşlemesi kullanır, gerçek
  bir dil modeli değildir. Örnek cümlelerin dışına çıkan girdilerde niyeti
  yanlış anlayabilir ya da 2 denemeden sonra insana devreder (bu da kasıtlı
  bir davranıştır — spec §16).
- **Ses tek yönlü ölçüm** — mikrofon seviyesi gösterilir ama STT'ye
  gönderilmez (Faz 3).
