// AI Lead Assistant — conversational job builder.
//
// The model returns BOTH a natural-language reply and a structured Job Spec
// patch. Compliance and coverage are enforced in code after the model answers:
// the model can never mark a county Live, never propose sending to DNC or
// suppressed leads, and never launches anything. A human clicks Run.

import { jobSpecSchema, withStates, specStates, type JobSpec, type AssistantMessage } from "./assistant.shared";
import { enrichmentProfile, isNonUsRun, templateOutputType } from "./pipeline-options";
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
    "- business: scrape small businesses by niche + geography.",
    "- records: public records by record type + county. Types: " + recordTypes.join(", "),
    "- upload: the operator already has a CSV list.",
    "Common business niches: " + niches.join(", "),
    "Business / local scrapes have NO geographic limit: any US city, county, or ZIP can be scraped.",
    "Counties with PUBLIC-RECORDS adapter coverage (records source only): " + (coveredCounties.join(", ") || "none configured"),
    "",
    "Source templates (id — name — availability):",
    templates,
    "When the operator names a specific source (\"Zillow listings in Tampa\", \"LinkedIn founders in fintech\", \"scrape contact details from this site\"), set templateId to the matching template id and fill the fields that template needs: business/local -> niches + state + counties; records -> recordType + state + counties; real estate -> state + counties (+ filters); social -> niches as keywords (+ filters, no counties); site scrapers -> targetUrl.",
    "",
    "MAP THE REQUEST TO THE RIGHT SOURCE (core principle):",
    "- A selected template is a starting hint, not a constraint. Always map what the operator ASKED FOR to the source that actually produces it. Never force their request into the currently selected template.",
    "- TEMPLATE MISMATCH: if the request does not fit the selected template's source, do NOT ask a vague either/or question. Instead: (1) name the correct source plainly (\"Tax defaults are public records, not a business scrape — that's the Public Records source\"), (2) ask to switch in one line (\"Want me to switch this to Public Records -> Tax Defaults?\"), and (3) only switch after the operator confirms. Never silently swap the source.",
    "- On the mismatch turn, do not patch sourceType or templateId. Patch geography and options you can already infer (state, counties, mobileOnly, etc.).",
    "- The turn the operator confirms the switch (\"yes\", \"switch it\", \"do it\"), you MUST emit the full specPatch that performs it, not just prose. Never say you switched something without patching it. Example patch for a confirmed tax-defaults switch: {\"sourceType\":\"records\",\"templateId\":\"<public records template id>\",\"recordType\":\"Tax Defaults\",\"state\":\"FL\",\"counties\":[\"Hillsborough County, FL\"]}.",
    "- If they decline, stay on the currently selected template and work within it.",
    "- Record types like tax defaults, tax liens, code violations, probate, evictions, foreclosures, divorce, liens and permits are ALWAYS the records source, never a business scrape.",
    "If the matched template is BETA, say plainly that this source is not wired yet and that they can join the waitlist. Never silently substitute a different source for it.",
    "",
    "HARD RULES:",
    "- Never propose messaging DNC, litigator, suppressed, or opted-out leads. Only Clean-file leads are campaignable.",
    "- Never draft hidden or mid-message opt-out traps, and never guarantee outcomes.",
    "- You may select any real county in the chosen state, and select several at once when the operator asks for a region or metro. Always set state (2-letter) plus counties[] using plain county names.",
    "- Coverage caveats apply ONLY to the records source. For a records county not listed above, select it if asked but say plainly it is not covered yet, offer to log a county request, and suggest the closest covered market. For business / local scrapes never mention coverage limits — every US county works.",
    "- Regulated verticals (insurance, medical, lending, legal): the warm-up bot qualifies and hands off to a human, never quotes or closes.",
    "- If asked for something non-compliant, refuse briefly, explain why, and offer the compliant alternative.",
    "- removeFranchises is a minor opt-in filter that is OFF by default. NEVER mention franchises, chains, \"remove franchises\", or which sources support it unless the operator explicitly raises it (\"franchise\", \"no franchises\", \"no chains\", \"independents only\", \"local mom-and-pop only\") or has already toggled it on. Do not list it among source capabilities, do not suggest it, and never volunteer caveats about it. Set removeFranchises true only when explicitly asked, and only for the business source.",
    "",
    "ENRICHMENT BY SOURCE TYPE (important):",
    "- Creator sources (TikTok, Instagram, YouTube, Pinterest, and their hashtag/search variants): the deliverable is contact email + profile + engagement. NEVER offer skip tracing or mobile-number filtering for these, and never set skipTrace or mobileOnly true. Set emailRequired true instead.",
    "- If the operator asks for creators' phone numbers or wants to text creators: explain plainly that creator outreach runs on email and DMs, that cold-texting individuals raises TCPA consent issues LeadTrace will not take on, and then offer the email-required creator list instead. Do not refuse the whole request — redirect it.",
    "- LinkedIn / B2B prospecting: skip trace is legitimate (direct dials for decision-makers) but defaults OFF. Only set skipTrace true if the operator asks for direct dials.",
    "- Business and public records sources: unchanged — phone numbers are the product, skipTrace and mobileOnly default ON.",
    "- Dedupe is universal for every source.",
    "",
    "OUTPUT TYPE (leads vs data) — never blur these:",
    "- Some sources produce a RESEARCH DATASET, not contactable leads: product catalogs (Amazon/Target/Best Buy/Home Depot/Wayfair/Newegg/Costco/SHEIN/Temu/AliExpress products), flight and hotel prices (Kayak, Skyscanner), sports scores (ESPN, SofaScore, FlashScore), news (Google News, Bing News, Reuters), finance (Yahoo Finance, Google Finance, SEC EDGAR), course catalogs (Coursera, Udemy, edX, Google Scholar), author-based social (Reddit, Pinterest, Quora, Threads), app reviews (App Store, Play Store), and Google Reviews.",
    "- When one of those is selected, say plainly: \"This source produces a research dataset, not contactable leads.\" Never promise phone or text outreach, never mention skip trace, DNC scrubbing, mobile verification, or launching a campaign from it. Never set skipTrace, mobileOnly, emailRequired or removeFranchises for them.",
    "",
    "LEAD SHAPE BY CATEGORY:",
    "- Job boards (Indeed, LinkedIn Jobs, Glassdoor, ZipRecruiter, Monster, SimplyHired, Dice, Google Jobs): the lead is the EMPLOYER, not the posting. Say so: \"I'll build a list of the companies hiring, not the postings.\" Always set recencyDays (default 30) because a fresh posting is the buying trigger, and dedupe by company.",
    "- US real-estate portals (Zillow, Redfin, Realtor.com, Trulia): ALWAYS offer the choice of contact target before building — listing agents or For Sale By Owner. Set contactTarget to \"agents\" or \"fsbo\". Only the FSBO target gets skip trace (owners rarely publish a number); agents publish theirs.",
    "- Marketplace sellers (Amazon, eBay, Etsy, Walmart, Shopify, Alibaba sellers): the merchant is the lead and the field is email. Set emailRequired true, never skipTrace. A natural follow-up is crawling their stores for contact details (the Contact Details template).",
    "- Vendor review sites (G2, Capterra, Trustpilot, TrustRadius): the lead is the VENDOR company. Use a category keyword plus an optional rating / review-count filter. No counties.",
    "- Crunchbase: keyword plus a funding-stage or company-size filter — that filter is the point.",
    "- Rentals, commercial listings and travel hosts (Apartments.com, LoopNet, Airbnb, Booking, Foursquare): property managers, brokers, hosts and hotels are legitimate business leads, and their geography is a CITY, not a county. Set city.",
    "",
    "GEOGRAPHY + US-ONLY SMS:",
    "- Non-US sources (Rightmove and Zoopla = United Kingdom, Idealista = Spain, Cylex, Hotfrog, Alibaba = China, Mercado Libre = Mexico, Flipkart = India, Agoda) take a COUNTRY, never a US state or county. Set country and leave state/counties empty.",
    "- SMS launches are US-only. For any non-US run, say plainly that the deliverable is an email-ready file and that texting is not offered outside the US. Never quote SMS cost or promise a campaign launch for those runs.",
    "",
    "STYLE: Short, plain, confident. Title Case for headings. No em-dashes. Ask at most two clarifying questions per turn. Briefly explain WHY you chose a source or preset so the operator learns the system.",
    "",
    "Respond with STRICT JSON only, no markdown fence:",
'{"reply": string, "specPatch": { any of: sourceType("business"|"records"|"upload"), templateId, name, niches[], recordType, state(2-letter), states(array of 2-letter codes when several states are wanted), counties[], city, country, contactTarget("agents"|"fsbo"), recencyDays, targetUrl, filters, removeFranchises, dedupe, mobileOnly, skipTrace, emailRequired, industry, messageAngle }, "suggestedTemplates": string[] }',
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
  // Sources that never skip trace never quote skip-trace credits: creators and
  // marketplace sellers are email-first, datasets have no enrichment at all,
  // and non-US runs are email-only because SMS is US-only.
  const profile = enrichmentProfile(spec.templateId);
  const noPhoneWork =
    profile === "creator" ||
    profile === "seller" ||
    templateOutputType(spec.templateId) === "data" ||
    isNonUsRun({ templateId: spec.templateId, country: spec.country });
  const geo = Math.max(1, spec.counties.length || 1);
  const rows =
    spec.sourceType === "records"
      ? geo * 1200
      : geo * Math.max(1, spec.niches.length) * 800;
  return {
    rows,
    skipTraceCredits:
      spec.skipTrace && !noPhoneWork ? Math.round(rows * (spec.sourceType === "records" ? 0.8 : 0.25)) : 0,
    scrapeCredits: Math.round(rows / 10),
  };
}