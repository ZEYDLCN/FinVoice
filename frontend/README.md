# frontend — FinVoice Ops ürün arayüzü

Next.js (App Router) + TypeScript + Tailwind ile FinVoice Ops'un kurumsal,
çok sayfalı ürün deneyimi: genel bakış, serbest metinli Voice Console, adım
adım rehberli iş akışları (workflows), canlı Prometheus dashboard'u ve servis
adresi ayarları. Sidebar + topbar'lı tek bir "app shell" içinde, ortak bir
tasarım token sistemiyle (açık/koyu tema) inşa edildi.

> Bu dosyanın Faz 2'ye özgü kısmı (`demoAgent.ts` neden var, WebRTC neden
> yok) hâlâ geçerli ve aşağıda korundu — sadece artık tek sayfalık bir
> "Voice Console" değil, çok sayfalı bir ürünün bir parçası.

## Sayfalar

| Rota | Açıklama |
|------|----------|
| `/` | Genel Bakış — servis durumu, temel iş metrikleri, faz yol haritası, hızlı erişim kartları |
| `/console` | Voice Console — serbest metinle (mikrofon seviyesi göstergesiyle) sohbet, transcript + tool activity panelleri |
| `/workflows` | İş Akışları hub'ı — 4 rehberli akışın kart listesi |
| `/workflows/claim` | Hasar dosyası oluşturma — 3 adım: poliçe doğrulama → kaza detayları → özet/onay |
| `/workflows/claim-status` | Hasar dosyası durumu sorgulama |
| `/workflows/coverage` | Poliçe teminatı sorgulama (yapılandırılmış kontrol) + sözleşme metninde RAG araması |
| `/workflows/lost-card` | Kayıp kart bildirimi — 3 adım: müşteri doğrulama → kart seçimi → dondur+yenile |
| `/dashboard` | Canlı Prometheus dashboard'u — her servisin `/metrics`'ini okuyup iş metriklerine çevirir |
| `/settings` | Servis adresleri (mock-enterprise/backend/voice/rag) — cookie olarak saklanır |

Tüm sayfalar aynı `AppShell` (sidebar + topbar + canlı servis durumu şeridi)
içinde render edilir; masaüstünde sabit sidebar, mobilde hamburger menüsü
açılan bir drawer'a dönüşür.

## Tasarım sistemi

`src/app/globals.css` içinde tek bir token seti tanımlanır (`--bg`,
`--surface`, `--border`, `--text-primary/secondary/muted`, `--brand`,
`--accent`, `--success/warning/danger/info`, `--shadow-*`) ve hem açık hem
koyu tema için (`prefers-color-scheme` + manuel `data-theme` override)
değerleri değişir. Bütün sayfalar ve `src/components/ui/*` bileşenleri
(`Card`, `Badge`, `Button`, `StatTile`, `EmptyState`, `Field`, `Stepper`)
doğrudan Tailwind renk sınıfları yerine bu token'ları kullanır — böylece tek
bir yerden tema değiştirmek mümkündür. İkonlar `lucide-react`'ten gelir.

## Servis adresi yapılandırması (`/settings`)

Bu frontend dört bağımsız backend servisiyle konuşur: `mock-enterprise`
(Faz 1), `backend` (Faz 4), `voice` (Faz 3/5), `rag` (Faz 6). Varsayılan
adresler ortam değişkenlerinden gelir (`src/lib/serviceConfig.ts` →
`SERVICE_DEFAULTS`), ancak `/settings` sayfası bunları tarayıcı cookie'si
olarak override edebilir (`finvoice_url_*`). Her API route
(`api/agent/*`, `api/workflows/*`, `api/status`, `api/metrics/summary`)
isteği işlerken `getServiceUrls()` ile önce cookie'yi, yoksa env
varsayılanını okur — böylece kod yeniden derlenmeden farklı bir ortama
(ör. tünellenmiş uzak bir servis) yönlendirilebilir.

## Neden Voice Console'da "text-mode"?

`ROADMAP.md`'deki Faz sırası: önce API'ler (Faz 1), sonra frontend kabuğu
(Faz 2), sonra ses girişi (Faz 3) ve ancak ondan sonra gerçek LLM agent
(Faz 4). Faz 2'de henüz ne STT ne de LangGraph agent vardı. Bu nedenle iki
şey inşa edildi:

1. **Gerçek altyapı:** mikrofon izni + ses seviyesi ölçümü (`useMicrophone`),
   transcript paneli, tool activity paneli.
2. **Geçici bir "scripted demo agent"** (`src/lib/demoAgent.ts`): LLM
   kullanmayan, anahtar kelime/regex tabanlı basit bir state machine. Amacı
   sahte akıl yürütme yapmak değil — `backend/`'deki gerçek LangGraph
   agent'ının oturacağı **plumbing'i** (API route → tool call →
   mock-enterprise → UI'da transcript + tool activity) gerçek ve çalışır
   halde kanıtlamaktır.

**`backend/` servisi bağımsız ve tamamen gerçek** (LangGraph + Ollama/Qwen,
kendi test paketiyle doğrulandı — bkz. `backend/README.md`) ama bu frontend
onunla değil, hâlâ `demoAgent.ts` ile konuşuyor: kök `README.md`'de belirtildiği
gibi, fazlar arasındaki orkestrasyon kablolaması bilinçli olarak kapsam
dışı bırakıldı. `/dashboard` sayfası `backend`'in `/metrics`'ini doğrudan
okuduğu için, `backend`'e `curl` ile gerçek bir sohbet gönderirseniz (bkz.
kök README "Faz 4" bölümü) o trafiği Dashboard'da canlı görürsünüz —
Console üzerinden değil.

## Desteklenen senaryolar (spec §34)

Hem Voice Console'da serbest metinle hem `/workflows` altında adım adım
rehberli formlarla:

| # | Senaryo | Workflow sayfası | Console'da örnek giriş |
|---|---------|-------------------|--------------------------|
| 1 | Hasar dosyası oluşturma | `/workflows/claim` | "Arabamla kaza yaptım, hasar dosyası açtırmak istiyorum." |
| 2 | Hasar durumu sorgulama | `/workflows/claim-status` | "Hasar dosyamın durumunu öğrenmek istiyorum." |
| 3 | Poliçe teminat sorgusu | `/workflows/coverage` | "Kaskom çekici hizmetini kapsıyor mu?" |
| 4 | Kayıp kart bildirimi | `/workflows/lost-card` | "Kartımı kaybettim." |
| 5 | Human handoff | — (Console'a özgü) | "Bir temsilciyle görüşmek istiyorum." (veya niyet 2 denemede anlaşılamazsa otomatik) |

Demo müşterisi: `CUST-001` (Zeyd Alcan), poliçesi `TR-92831`, kartı
`CARD-9001` — bkz. `mock-enterprise/README.md`.

Workflow sayfaları, Console'un aksine `demoAgent.ts`'e değil doğrudan
`src/lib/mockApi.ts` istemcisine (aynı gerçek mock-enterprise API'lerine)
gider — `src/app/api/workflows/*/route.ts` altındaki ince proxy route'lar
üzerinden. `coverage` workflow'u ayrıca `rag/` servisine de gerçek bir arama
isteği gönderir.

## Mimari notu: neden gerçek bir WebRTC/RTCPeerConnection yok?

`useMicrophone` hook'u `getUserMedia` ile mikrofona erişip Web Audio API
üzerinden ses seviyesini ölçüyor — bu WebRTC'nin medya yakalama katmanı.
Bilerek bir `RTCPeerConnection` **kurulmuyor**: Console, sesi `voice/`
servisine henüz streaming olarak göndermiyor (bu entegrasyon da
orkestrasyon kablolaması kapsamında, bkz. yukarıdaki not).

## Çalıştırma

Önce en azından `mock-enterprise` servisinin ayakta olması gerekir (bkz. kök
`README.md`). Dashboard ve diğer workflow'lardan tam verim almak için
`backend`, `voice` ve `rag` servislerini de başlatın.

```bash
cd frontend
npm install
cp .env.example .env.local   # servis URL'lerini gerekirse düzenleyin
npm run dev
```

http://localhost:3000 açın. Sidebar'dan bir sayfa seçin, ya da doğrudan bir
workflow'u deneyin. Servis adreslerini yeniden derlemeden değiştirmek için
`/settings` sayfasını kullanın.

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
│   ├── page.tsx                      # Genel Bakış (/)
│   ├── console/page.tsx              # Voice Console (Faz 2 demoAgent)
│   ├── workflows/
│   │   ├── page.tsx                  # İş Akışları hub'ı
│   │   ├── claim/page.tsx            # Hasar dosyası oluşturma (3 adım)
│   │   ├── claim-status/page.tsx     # Hasar durumu sorgulama
│   │   ├── coverage/page.tsx         # Teminat sorgulama + RAG arama
│   │   └── lost-card/page.tsx        # Kayıp kart bildirimi (3 adım)
│   ├── dashboard/page.tsx            # Canlı Prometheus dashboard'u
│   ├── settings/page.tsx             # Servis adresi ayarları (server component)
│   ├── layout.tsx                    # AppShell wrapper + metadata
│   ├── globals.css                   # Tasarım token sistemi (açık/koyu tema)
│   └── api/
│       ├── agent/
│       │   ├── message/route.ts      # POST { sessionId, text } -> AgentTurnResponse (demoAgent)
│       │   └── reset/route.ts        # POST { sessionId } -> { ok: true }
│       ├── status/route.ts           # GET -> 4 servisin health durumu (paralel ping)
│       ├── metrics/summary/route.ts  # GET -> 4 servisin /metrics'inden hesaplanan iş metrikleri
│       └── workflows/
│           ├── claim/route.ts        # check-policy | submit
│           ├── claim-status/route.ts
│           ├── coverage/route.ts     # check (mock-enterprise) | search (rag)
│           └── lost-card/route.ts    # list-cards | freeze-and-replace
├── components/
│   ├── ui/                           # Card, Badge, Button, StatTile, EmptyState, Field, Stepper
│   ├── layout/                       # AppShell, PageHeader/PageBody, ServiceStatusStrip, nav.ts
│   ├── SettingsForm.tsx              # /settings'in client bileşeni (cookie yazma)
│   ├── MicVisualizer.tsx             # mikrofon izni + ses seviyesi çubukları
│   ├── TranscriptPanel.tsx           # gerçek zamanlı transcript
│   ├── ToolActivityPanel.tsx         # intent + tool call log + handoff context
│   └── ChatConsole.tsx               # metin girişi + örnek komutlar
├── hooks/
│   └── useMicrophone.ts
└── lib/
    ├── types.ts                      # paylaşılan tipler (client + server)
    ├── serviceConfig.ts              # servis URL'leri: env varsayılanı + cookie override
    ├── mockApi.ts                    # mock-enterprise REST client + tool-call timing
    ├── prometheusParser.ts           # Prometheus text exposition format parser
    ├── demoAgent.ts                  # Console'un scripted agent'ı (bkz. yukarıdaki not)
    └── sessionStore.ts               # process-in-memory conversation state
```

## Bilinen sınırlamalar (bilerek)

- **Session store process-in-memory'dir** — yalnızca tek instance'ta çalışır,
  yeniden başlatınca sıfırlanır.
- **Console gerçek bir NLU/LLM kullanmaz** — `demoAgent.ts` basit anahtar
  kelime eşlemesi kullanır. `backend/`'deki gerçek LangGraph agent'ı ayrı ve
  tamamen fonksiyonel bir servistir, ancak Console ona bağlı değildir (bkz.
  yukarıdaki mimari notu). Workflow sayfaları bu sınırlamadan etkilenmez —
  onlar doğrudan gerçek REST API'lere gider.
- **Ses tek yönlü ölçüm** — mikrofon seviyesi gösterilir ama STT'ye
  gönderilmez.
- **Dashboard, Grafana'nın yerini almaz** — `monitoring/`'deki gerçek
  Prometheus/Grafana kurulumu çok daha fazla panel ve geçmiş veri sunar;
  `/dashboard` sayfası servisleri ayrıca kurmadan hızlı bir sağlık/metrik
  özeti vermek için native olarak (`/metrics` + `prometheusParser.ts`)
  yazıldı.
