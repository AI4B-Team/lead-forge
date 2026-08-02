// AI Lead Assistant — conversational job builder.
//
// The model returns BOTH a natural-language reply and a structured Job Spec
// patch. Compliance and coverage are enforced in code after the model answers:
// the model can never mark a county Live, never propose sending to DNC or
// suppressed leads, and never launches anything. A human clicks Run.

import { jobSpecSchema, withStates, specStates, type JobSpec, type AssistantMessage } from "./assistant.shared";
import { countiesForState, formatCounty, parseCounty } from "./us-geo";

/** Snap model-provided county names onto real counties in the spec's state. */
function normalizeCounties(counties: string[], state: string | null): string[] {
  if (!state) return counties;
  const all = countiesForState(state);
  const out: string[] = [];
  for (const raw of counties) {
    const bare = parseCounty(raw).county.replace(/\b(county|parish|borough)\b/gi, "").trim();
    const hit = all.find((c) => c.toLowerCase() === bare.toLowerCase());
    const label = formatCounty(hit ?? bare, state);
    if (!out.some((v) => v.toLowerCase() === label.toLowerCase())) out.push(label);
  }
  return out;
}

const NON_COMPLIANT = [
  { re: /\b(text|message|send)\b[^.?!]{0,40}\b(dnc|do not call|litigator|suppressed|opted[- ]out)\b/i, why: "Only Clean-File Leads Are Campaignable. DNC, Litigator And Suppressed Numbers Are Never Sent To." },
  { re: /\b(hide|bury|remove|skip|omit)\b[^.?!]{0,30}\b(opt[- ]?out|stop|unsubscribe)\b/i, why: "Every Message Carries A Standard, Visible STOP Opt-Out. It Cannot Be Hidden Or Reworded Into A Trap." },
  { re: /\b(auto[- ]?(close|sell|quote|bind)|close the (deal|sale)|guarantee)\b/i, why: "The Warm-Up Bot Qualifies And Hands Off. It Never Closes, Quotes, Or Guarantees An Outcome." },
];

export function precheckCompliance(message: string): string | null {
  for (const p of NON_COMPLIANT) if (p.re.test(message)) return p.why;
  return null;
}

function systemPrompt(coveredCounties: string[], niches: string[], recordTypes: string[], templates: string): string {
  return [
    "You are the LeadTrace AI Lead Assistant. You turn a plain-English lead goal into a concrete, runnable pipeline List Spec.",
    "You ASSEMBLE and PROPOSE lists. You never run, launch, or send anything — a human clicks Run.",
    "Vocabulary: the saved thing you assemble is a LIST; one execution of it is a RUN. Never call either a \"job\".",
    "",
    "Available sources:",
    "- business: scrape small businesses by niche + geography (franchises removable, off by default).",
    "- records: public records by record type + county. Types: " + recordTypes.join(", "),
    "- upload: the operator already has a CSV list.",
    "Common business niches: " + niches.join(", "),
    "Counties with adapter coverage: " + (coveredCounties.join(", ") || "none configured"),
    "",
    "Source templates (id — name — availability):",
    templates,
    "When the operator names a specific source (\"Zillow listings in Tampa\", \"LinkedIn founders in fintech\", \"scrape contact details from this site\"), set templateId to the matching template id and fill the fields that template needs: business/local -> niches + state + counties; records -> recordType + state + counties; real estate -> state + counties (+ filters); social -> niches as keywords (+ filters, no counties); site scrapers -> targetUrl.",
    "If the matched template is BETA, say plainly that this source is not wired yet and that they can join the waitlist. Never silently substitute a different source for it.",
    "",
    "HARD RULES:",
    "- Never propose messaging DNC, litigator, suppressed, or opted-out leads. Only Clean-file leads are campaignable.",
    "- Never draft hidden or mid-message opt-out traps, and never guarantee outcomes.",
    "- You may select any real county in the chosen state, and select several at once when the operator asks for a region or metro. Always set state (2-letter) plus counties[] using plain county names.",
    "- Never claim adapter coverage for a county not listed above. Select it if asked, but say plainly it is not covered yet, offer to log a county request, and suggest the closest covered market or another source.",
    "- Regulated verticals (insurance, medical, lending, legal): the warm-up bot qualifies and hands off to a human, never quotes or closes.",
    "- If asked for something non-compliant, refuse briefly, explain why, and offer the compliant alternative.",
    "- removeFranchises defaults to FALSE. Set removeFranchises true ONLY when the operator asks for it (\"remove franchises\", \"no franchises\", \"no chains\", \"independents only\", \"local mom-and-pop only\"), and only for the business source. Never set it for records or upload sources.",
    "",
    "STYLE: Short, plain, confident. Title Case for headings. No em-dashes. Ask at most two clarifying questions per turn. Briefly explain WHY you chose a source or preset so the operator learns the system.",
    "",
    "Respond with STRICT JSON only, no markdown fence:",
    '{"reply": string, "specPatch": { any of: sourceType("business"|"records"|"upload"), templateId, name, niches[], recordType, state(2-letter), states(array of 2-letter codes when several states are wanted), counties[], recencyDays, targetUrl, filters, removeFranchises, dedupe, mobileOnly, skipTrace, industry, messageAngle }, "suggestedTemplates": string[] }',
    "Only include specPatch keys you actually resolved this turn. Leave the rest out.",
  ].join("\n");
}

type ModelOut = { reply: string; specPatch?: Record<string, unknown>; suggestedTemplates?: string[] };

export async function askAssistant(opts: {
  history: AssistantMessage[];
  message: string;
  spec: JobSpec;
  coveredCounties: string[];
  niches: string[];
  recordTypes: string[];
  /** "id — Title — live|beta" lines so the model can match a named source. */
  templateCatalog?: string;
}): Promise<{ reply: string; spec: JobSpec; suggestedTemplates: string[] }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return {
      reply: "The Assistant Is Temporarily Unavailable. You Can Still Build It Yourself In The List Builder On The Right.",
      spec: opts.spec,
      suggestedTemplates: [],
    };
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt(opts.coveredCounties, opts.niches, opts.recordTypes, opts.templateCatalog ?? "none") },
        { role: "system", content: `Current List Spec (JSON): ${JSON.stringify(opts.spec)}` },
        ...opts.history.slice(-12),
        { role: "user", content: opts.message },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (res.status === 429) throw new Error("Rate Limit Reached. Try Again In A Moment.");
  if (res.status === 402) throw new Error("AI Credits Exhausted. Add Credits To Keep Using The Assistant.");
  if (!res.ok) throw new Error("The Assistant Could Not Answer. Try Again.");

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const raw = (json.choices?.[0]?.message?.content ?? "").trim();
  let out: ModelOut;
  try {
    out = JSON.parse(raw.replace(/^```(?:json)?/i, "").replace(/```$/, "")) as ModelOut;
  } catch {
    return { reply: raw || "Say A Little More About The Leads You Want.", spec: opts.spec, suggestedTemplates: [] };
  }

  const merged = jobSpecSchema.safeParse({ ...opts.spec, ...(out.specPatch ?? {}) });
  // The model may name one state or several; keep both fields consistent.
  const spec = merged.success
    ? (() => {
        const synced = withStates(merged.data, specStates(merged.data));
        return {
          ...synced,
          // Franchise removal is business-only; never carry it onto other sources.
          removeFranchises: synced.sourceType === "business" ? synced.removeFranchises : false,
          counties: normalizeCounties(synced.counties, synced.state),
        };
      })()
    : opts.spec;
  return {
    reply: out.reply?.trim() || "Updated The List Builder On The Right.",
    spec,
    suggestedTemplates: (out.suggestedTemplates ?? []).slice(0, 4),
  };
}

/** Rough, honest pre-run estimate. Never presented as an exact bill. */
export function estimate(spec: JobSpec): { rows: number; skipTraceCredits: number; scrapeCredits: number } | null {
  if (!spec.sourceType || spec.sourceType === "upload") return null;
  const geo = Math.max(1, spec.counties.length || 1);
  const rows =
    spec.sourceType === "records"
      ? geo * 1200
      : geo * Math.max(1, spec.niches.length) * 800;
  return {
    rows,
    skipTraceCredits: spec.skipTrace ? Math.round(rows * (spec.sourceType === "records" ? 0.8 : 0.25)) : 0,
    scrapeCredits: Math.round(rows / 10),
  };
}