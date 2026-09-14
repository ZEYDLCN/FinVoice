/**
 * Scripted "text-mode" demo agent.
 *
 * This is NOT the LangGraph/LLM agent described in ROADMAP.md Faz 4 — it is
 * a small, deterministic keyword/regex state machine whose only job is to
 * prove the rest of the pipeline (transcript, tool-activity instrumentation,
 * real mock-enterprise API calls, human handoff) end-to-end before the real
 * reasoning engine exists. Swapping this module out for a LangGraph graph in
 * Phase 4 should not require touching the API route or the UI.
 */
import { callTool, mockApi, ToolExecutionError } from "./mockApi";
import type {
  AgentTurnResponse,
  ConversationState,
  Intent,
  ToolCallLogEntry,
  TranscriptMessage,
} from "./types";

const HUMAN_HANDOFF_KEYWORDS = [
  "temsilci",
  "operatör",
  "operator",
  "canlı destek",
  "insana bağla",
];

const CLAIM_STATUS_KEYWORDS = ["durum", "ne durumda", "sorgula", "nerede"];
const COVERAGE_KEYWORDS_TR = [
  "kapsıyor",
  "kapsam",
  "karşılıyor",
  "dahil mi",
  "teminat",
];
const LOST_CARD_ACTION_WORDS = ["kaybet", "kayıp", "çaldı", "çalındı", "dondur"];

const COVERAGE_TOPICS = [
  "çekici",
  "cekici",
  "hırsızlık",
  "hirsizlik",
  "çalınma",
  "calinma",
  "yangın",
  "yangin",
  "cam",
  "çarpışma",
  "carpisma",
  "kaza",
  "towing",
  "theft",
  "fire",
  "glass",
  "collision",
];

const CLAIM_STATUS_LABELS_TR: Record<string, string> = {
  OPEN: "açık, henüz değerlendirme aşamasında",
  EXPERT_REVIEW: "eksper incelemesinde",
  APPROVED: "onaylandı",
  REJECTED: "reddedildi",
  CLOSED: "kapatıldı",
};

function has(text: string, ...words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

function detectIntent(rawText: string): Intent {
  const t = rawText.toLowerCase();
  if (has(t, ...HUMAN_HANDOFF_KEYWORDS)) return "human_handoff";
  if (t.includes("kart") && has(t, ...LOST_CARD_ACTION_WORDS)) return "lost_card";
  if (has(t, ...COVERAGE_KEYWORDS_TR)) return "policy_coverage";
  if (/clm-\d/.test(t) || (t.includes("hasar") && has(t, ...CLAIM_STATUS_KEYWORDS))) {
    return "claim_status";
  }
  if (t.includes("kaza") || t.includes("hasar dosyası") || (t.includes("hasar") && has(t, "aç", "oluştur"))) {
    return "create_claim";
  }
  return null;
}

function extractPolicyNumber(text: string): string | undefined {
  return text.match(/\bTR-\d{4,6}\b/i)?.[0].toUpperCase();
}

function extractClaimId(text: string): string | undefined {
  return text.match(/\bCLM-\d{4,6}\b/i)?.[0].toUpperCase();
}

function extractCustomerId(text: string): string | undefined {
  return text.match(/\bCUST-\d{3,6}\b/i)?.[0].toUpperCase();
}

function extractCoverageTopic(text: string): string | undefined {
  const t = text.toLowerCase();
  return COVERAGE_TOPICS.find((k) => t.includes(k));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function extractDate(text: string): string | undefined {
  const t = text.toLowerCase();
  const now = new Date();
  if (t.includes("bugün")) return isoDate(now);
  if (t.includes("dün")) return isoDate(new Date(now.getTime() - 86_400_000));
  if (t.includes("geçen hafta") || t.includes("gecen hafta")) {
    return isoDate(new Date(now.getTime() - 7 * 86_400_000));
  }
  const iso = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  const tr = text.match(/\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/);
  if (tr) {
    const [, d, m, y] = tr;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return undefined;
}

function pushMessage(state: ConversationState, role: TranscriptMessage["role"], text: string) {
  state.history.push({
    id: crypto.randomUUID(),
    role,
    text,
    timestamp: new Date().toISOString(),
  });
}

function buildHandoffSummary(state: ConversationState, reason: string): string {
  const lines = [
    `Intent: ${state.intent ?? "bilinmiyor"}`,
    ...Object.entries(state.slots).map(([k, v]) => `${k}: ${v}`),
    `Handoff nedeni: ${reason}`,
    "",
    "Son mesajlar:",
    ...state.history.slice(-6).map((m) => `${m.role}: ${m.text}`),
  ];
  return lines.join("\n");
}

function toHandoff(state: ConversationState, reason: string) {
  state.handoff = {
    intent: state.intent,
    policyNumber: state.slots.policyNumber,
    collectedData: { ...state.slots },
    reason,
    summary: buildHandoffSummary(state, reason),
  };
  state.intent = null;
  state.awaitingSlot = null;
}

async function run(
  name: string,
  input: Record<string, unknown>,
  fn: () => Promise<unknown>,
  toolCalls: ToolCallLogEntry[]
) {
  const { result, log } = await callTool(name, input, fn);
  toolCalls.push(log);
  return result;
}

/** Advances the conversation by exactly one user turn. Mutates `state`.
 * `baseUrl` overrides the mock-enterprise URL for this call (Settings page). */
export async function handleTurn(
  state: ConversationState,
  userText: string,
  baseUrl?: string
): Promise<AgentTurnResponse> {
  const toolCalls: ToolCallLogEntry[] = [];
  pushMessage(state, "customer", userText);

  let reply: string;
  let confidence = 0.9;

  try {
    // A request to talk to a human always interrupts whatever flow is active.
    if (detectIntent(userText) === "human_handoff") {
      toHandoff(state, "Kullanıcı temsilciyle görüşmek istedi");
      reply =
        "Sizi bir müşteri temsilcisine aktarıyorum. Görüşme özetiniz temsilciye iletildi.";
      confidence = 0.3;
    } else if (state.intent === "create_claim") {
      reply = await continueCreateClaim(state, userText, toolCalls, baseUrl);
    } else if (state.intent === "claim_status") {
      reply = await continueClaimStatus(state, userText, toolCalls, baseUrl);
    } else if (state.intent === "policy_coverage") {
      reply = await continuePolicyCoverage(state, userText, toolCalls, baseUrl);
    } else if (state.intent === "lost_card") {
      reply = await continueLostCard(state, userText, toolCalls, baseUrl);
    } else {
      const intent = detectIntent(userText);
      state.intent = intent;
      state.originalUtterance = userText;
      state.slots = {};
      if (intent !== null) {
        state.confusionCount = 0;
      }

      switch (intent) {
        case "create_claim":
          reply = await continueCreateClaim(state, userText, toolCalls, baseUrl);
          break;
        case "claim_status":
          reply = await continueClaimStatus(state, userText, toolCalls, baseUrl);
          break;
        case "policy_coverage":
          reply = await continuePolicyCoverage(state, userText, toolCalls, baseUrl);
          break;
        case "lost_card":
          reply = await continueLostCard(state, userText, toolCalls, baseUrl);
          break;
        default: {
          state.confusionCount += 1;
          if (state.confusionCount >= 2) {
            toHandoff(state, "Kullanıcı niyeti iki denemede de anlaşılamadı");
            reply =
              "Ne yazık ki isteğinizi anlayamadım, sizi bir müşteri temsilcisine aktarıyorum.";
            confidence = 0.3;
          } else {
            reply =
              "Size şu konularda yardımcı olabilirim: hasar dosyası açma, hasar durumu " +
              "sorgulama, poliçe teminat kontrolü ve kayıp kart bildirimi. Nasıl yardımcı olabilirim?";
            confidence = 0.4;
          }
        }
      }
    }
  } catch (err) {
    if (err instanceof ToolExecutionError) {
      toolCalls.push(err.log);
    }
    toHandoff(state, "Bir sistem hatası oluştu (tool call başarısız)");
    reply =
      "Şu anda bu işlemi tamamlarken bir sorun yaşadım, sizi bir müşteri temsilcisine aktarıyorum.";
    confidence = 0.2;
  }

  pushMessage(state, "ai", reply);

  return {
    reply,
    intent: state.intent,
    toolCalls,
    handoff: state.handoff,
    confidence,
  };
}

// ---------------------------------------------------------------------- //
// Scenario 1 — Create Insurance Claim (spec §2, §34 Scenario 1)
// ---------------------------------------------------------------------- //
async function continueCreateClaim(
  state: ConversationState,
  userText: string,
  toolCalls: ToolCallLogEntry[],
  baseUrl?: string
): Promise<string> {
  if (!state.slots.policyNumber) {
    const policyNumber = extractPolicyNumber(userText);
    if (!policyNumber) {
      state.awaitingSlot = "policyNumber";
      return "Geçmiş olsun. Poliçe numaranızı paylaşabilir misiniz? (örn. TR-92831)";
    }
    const policy = (await run(
      "get_policy",
      { policyNumber },
      () => mockApi.getPolicy(policyNumber, baseUrl),
      toolCalls
    )) as Awaited<ReturnType<typeof mockApi.getPolicy>>;

    if (policy.status !== "ACTIVE") {
      toHandoff(state, `Poliçe aktif değil (durum: ${policy.status})`);
      return `Poliçenizin durumu "${policy.status}" görünüyor, bu nedenle hasar kaydı açamıyorum. Sizi bir müşteri temsilcisine aktarıyorum.`;
    }
    state.slots.policyNumber = policyNumber;
    state.slots.customerName = policy.customer;
    state.awaitingSlot = "accidentDate";
    return "Poliçeniz aktif görünüyor. Kaza hangi tarihte gerçekleşti?";
  }

  if (!state.slots.accidentDate) {
    const date = extractDate(userText);
    if (!date) {
      state.awaitingSlot = "accidentDate";
      return "Tarihi anlayamadım, GG.AA.YYYY formatında paylaşabilir misiniz?";
    }
    state.slots.accidentDate = date;
    state.awaitingSlot = "location";
    return "Kazanın gerçekleştiği şehir/konumu paylaşır mısınız?";
  }

  if (!state.slots.location) {
    state.slots.location = userText.trim();
    state.awaitingSlot = null;

    const claim = (await run(
      "create_claim",
      {
        policyNumber: state.slots.policyNumber,
        accidentDate: state.slots.accidentDate,
        location: state.slots.location,
      },
      () =>
        mockApi.createClaim(
          {
            policyNumber: state.slots.policyNumber,
            accidentDate: state.slots.accidentDate,
            location: state.slots.location,
            description: state.originalUtterance ?? "Voice AI üzerinden oluşturuldu",
          },
          baseUrl
        ),
      toolCalls
    )) as Awaited<ReturnType<typeof mockApi.createClaim>>;

    state.intent = null;
    return `Hasar kaydınız başarıyla oluşturuldu. Dosya numaranız ${claim.claimId}.`;
  }

  // Should not normally be reached.
  state.intent = null;
  return "Hasar kaydınız zaten oluşturuldu. Başka bir konuda yardımcı olabilir miyim?";
}

// ---------------------------------------------------------------------- //
// Scenario 2 — Check Claim Status
// ---------------------------------------------------------------------- //
async function continueClaimStatus(
  state: ConversationState,
  userText: string,
  toolCalls: ToolCallLogEntry[],
  baseUrl?: string
): Promise<string> {
  const claimId = state.slots.claimId ?? extractClaimId(userText);
  if (!claimId) {
    state.awaitingSlot = "claimId";
    return "Hasar dosya numaranızı paylaşabilir misiniz? (örn. CLM-98221)";
  }
  state.slots.claimId = claimId;
  state.awaitingSlot = null;

  const claim = (await run(
    "get_claim_status",
    { claimId },
    () => mockApi.getClaimStatus(claimId, baseUrl),
    toolCalls
  )) as Awaited<ReturnType<typeof mockApi.getClaimStatus>>;

  state.intent = null;
  const label = CLAIM_STATUS_LABELS_TR[claim.status] ?? claim.status;
  return `Hasar dosyanız (${claim.claimId}) şu anda ${label}.`;
}

// ---------------------------------------------------------------------- //
// Scenario 3 — Ask Policy Coverage
// ---------------------------------------------------------------------- //
async function continuePolicyCoverage(
  state: ConversationState,
  userText: string,
  toolCalls: ToolCallLogEntry[],
  baseUrl?: string
): Promise<string> {
  if (!state.slots.policyNumber) {
    const policyNumber = extractPolicyNumber(userText);
    if (!policyNumber) {
      state.awaitingSlot = "policyNumber";
      return "Bu soruyu yanıtlayabilmem için poliçe numaranızı paylaşır mısınız?";
    }
    state.slots.policyNumber = policyNumber;
  }

  if (!state.slots.topic) {
    const topic = extractCoverageTopic(state.originalUtterance ?? userText) ?? extractCoverageTopic(userText);
    if (!topic) {
      state.awaitingSlot = "topic";
      return "Hangi teminatı öğrenmek istersiniz? (örn. çekici, hırsızlık, yangın, cam, çarpışma)";
    }
    state.slots.topic = topic;
  }

  state.awaitingSlot = null;
  const coverage = (await run(
    "check_policy_coverage",
    { policyNumber: state.slots.policyNumber, topic: state.slots.topic },
    () => mockApi.checkCoverage(state.slots.policyNumber, state.slots.topic, baseUrl),
    toolCalls
  )) as Awaited<ReturnType<typeof mockApi.checkCoverage>>;

  state.intent = null;
  return coverage.detail;
}

// ---------------------------------------------------------------------- //
// Scenario 4 — Lost Bank Card
// ---------------------------------------------------------------------- //
async function continueLostCard(
  state: ConversationState,
  userText: string,
  toolCalls: ToolCallLogEntry[],
  baseUrl?: string
): Promise<string> {
  if (!state.slots.customerId) {
    const customerId = extractCustomerId(userText);
    if (!customerId) {
      state.awaitingSlot = "customerId";
      return (
        "Bunu bildirebilmem için hesabınızı doğrulamam gerekiyor (bu demo ortamında " +
        "kimlik doğrulama henüz yok — Müşteri ID'nizi paylaşın, örn. CUST-001)."
      );
    }
    state.slots.customerId = customerId;
  }

  if (!state.slots.cardId) {
    const cards = (await run(
      "get_cards",
      { customerId: state.slots.customerId },
      () => mockApi.listCustomerCards(state.slots.customerId, baseUrl),
      toolCalls
    )) as Awaited<ReturnType<typeof mockApi.listCustomerCards>>;

    const active = cards.filter((c) => c.status === "ACTIVE");
    if (active.length === 0) {
      state.intent = null;
      return "Hesabınızda dondurulabilecek aktif bir kart bulamadım.";
    }
    if (active.length > 1 && !state.slots.last4) {
      state.awaitingSlot = "last4";
      return `Birden fazla aktif kartınız var (sonu ${active
        .map((c) => c.last4)
        .join(", ")} ile bitenler). Hangisini dondurmak istersiniz?`;
    }
    const chosen =
      active.length === 1
        ? active[0]
        : active.find((c) => c.last4 === state.slots.last4) ?? active[0];
    state.slots.cardId = chosen.cardId;
    state.slots.last4 = chosen.last4;
  }

  state.awaitingSlot = null;
  await run(
    "freeze_card",
    { cardId: state.slots.cardId },
    () => mockApi.freezeCard(state.slots.cardId, baseUrl),
    toolCalls
  );
  const newCard = (await run(
    "request_new_card",
    { cardId: state.slots.cardId },
    () => mockApi.requestReplacementCard(state.slots.cardId, baseUrl),
    toolCalls
  )) as Awaited<ReturnType<typeof mockApi.requestReplacementCard>>;

  state.intent = null;
  return (
    `Sonu ${state.slots.last4} ile biten kartınızı güvenlik nedeniyle dondurdum. ` +
    `Yeni kart talebinizi oluşturdum, tahmini teslimat süresi ${newCard.estimatedDeliveryDays} gün.`
  );
}
