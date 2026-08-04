// ---------------------------------------------------------------------------
// The assistant is a conversation, not a form-filler with a chat skin.
//
// Every turn that changes the List Spec must SAY what changed, in words:
//  - echo what it captured,
//  - name anything it inferred rather than was told, and why,
//  - ask the single next-most-important missing question, or state it's ready.
//
// This lives in code, not in the prompt, so a quiet model can never produce a
// silent panel mutation. Silent inference is how a 25-lead job becomes a
// 1,675-lead job, so it is treated as a safety mechanism, not polish.
// ---------------------------------------------------------------------------

import { specStates, type JobSpec } from "./assistant.shared";
import { parseGeoIntent } from "./geo-intent";
import { COUNTIES_BY_STATE, formatCounty, US_STATES } from "./us-geo";

/** Language that deliberately widens scope to a whole state. */
const WIDEN_RE = /\b(all|whole|entire|every|statewide|state[- ]wide|across the state|anywhere in)\b/i;

export function wantsWholeState(text: string): boolean {
  return WIDEN_RE.test(text);
}

/**
 * Counties the operator has named across the WHOLE conversation, not just this
 * turn. The first message ("pre-foreclosures in hillsborough county") is a
 * constraint that must survive every later answer about record type or timing.
 */
export function stickyCounties(
  userTexts: string[],
  opts: { stateHint?: string | null; existing?: string[] } = {},
): { counties: string[]; namedCounty: boolean; states: string[] } {
  const out: string[] = [...(opts.existing ?? [])];
  const states: string[] = [];
  let named = false;
  for (const text of userTexts) {
    const intent = parseGeoIntent(text, { stateHint: opts.stateHint ?? null });
    for (const s of intent.states) if (!states.includes(s)) states.push(s);
    if (!intent.counties.length) continue;
    named = true;
    // An explicit "all of Florida" replaces the narrow pick instead of adding.
    if (wantsWholeState(text)) continue;
    for (const c of intent.counties) {
      if (!out.some((v) => v.toLowerCase() === c.toLowerCase())) out.push(c);
    }
  }
  return { counties: out, namedCounty: named, states };
}

const STATE_BY_CODE = new Map(US_STATES.map((s) => [s.code, s.name]));

function countyPhrase(counties: string[]): string {
  if (!counties.length) return "";
  const labelled = counties.map((c) => {
    const [county, state] = c.split(",").map((p) => p.trim());
    const bare = (county ?? "").replace(/\b(county|parish|borough)\b/gi, "").trim();
    const isCounty = (COUNTIES_BY_STATE[state ?? ""] ?? []).some(
      (v) => v.toLowerCase() === bare.toLowerCase(),
    );
    return isCounty && state ? formatCounty(`${bare} County`, state) : c;
  });
  if (labelled.length <= 2) return labelled.join(" and ");
  return `${labelled.length} counties (${labelled.slice(0, 2).join(", ")} and ${labelled.length - 2} more)`;
}

function geoPhrase(spec: JobSpec): string {
  if (spec.counties.length) return countyPhrase(spec.counties);
  if (spec.city) return spec.city;
  const states = specStates(spec);
  if (states.length) {
    return states.map((s) => `all of ${STATE_BY_CODE.get(s) ?? s}`).join(" and ");
  }
  return spec.country ?? "";
}

function subjectPhrase(spec: JobSpec): string | null {
  if (spec.sourceType === "records") return spec.recordType ? `${spec.recordType} filings` : null;
  if (spec.sourceType === "street_scan") return "visibly distressed properties";
  if (spec.sourceType === "upload") return "your uploaded list";
  if (spec.niches.length) return spec.niches.join(", ");
  return null;
}

/** Did the operator's own words mention this value? Drives told-vs-inferred. */
function mentioned(userText: string, value: string): boolean {
  const words = value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 3);
  if (!words.length) return false;
  const t = userText.toLowerCase();
  return words.some((w) => t.includes(w));
}

export type TurnFields = {
  /** Plain-language echo of everything the spec now holds. */
  captured: string[];
  /** Values the assistant set that the operator never stated. */
  inferred: string[];
  /** The one next question, or null when nothing is missing. */
  question: string | null;
};

/**
 * Everything the reply must say, derived from the spec itself so it can't drift
 * from what the panel shows.
 */
export function turnFields(opts: {
  spec: JobSpec;
  priorSpec: JobSpec;
  /** Every user message this conversation, oldest first. */
  userTexts: string[];
}): TurnFields {
  const { spec, priorSpec } = opts;
  const said = opts.userTexts.join(" \n ");
  const captured: string[] = [];
  const inferred: string[] = [];

  const subject = subjectPhrase(spec);
  const geo = geoPhrase(spec);
  if (subject) captured.push(subject);
  if (geo) captured.push(geo);
  if (spec.recencyDays) captured.push(`last ${spec.recencyDays} days`);
  if (spec.maxResults) captured.push(`up to ${spec.maxResults.toLocaleString()} leads per search`);

  // Anything set this turn (or already set) that the operator never said.
  if (spec.recordType && !mentioned(said, spec.recordType)) {
    inferred.push(`record type ${spec.recordType}`);
  }
  if (spec.niches.length) {
    const unsaid = spec.niches.filter((n) => !mentioned(said, n));
    if (unsaid.length) inferred.push(`niches ${unsaid.join(", ")}`);
  }
  if (spec.recencyDays && !new RegExp(`\\b${spec.recencyDays}\\b`).test(said)) {
    inferred.push(`a ${spec.recencyDays}-day timeframe`);
  }
  if (spec.maxResults && !new RegExp(`\\b${spec.maxResults}\\b`).test(said)) {
    inferred.push(`a ${spec.maxResults.toLocaleString()}-lead cap per search`);
  }
  // Widening scope beyond what was named is the expensive one — always say it.
  if (!spec.counties.length && specStates(spec).length && !wantsWholeState(said)) {
    inferred.push(`no county filter, which would cover every county in ${specStates(spec).join(", ")}`);
  }
  const droppedCounties = priorSpec.counties.filter(
    (c) => !spec.counties.some((v) => v.toLowerCase() === c.toLowerCase()),
  );
  if (droppedCounties.length) inferred.push(`dropping ${countyPhrase(droppedCounties)}`);

  return { captured, inferred, question: nextQuestion(spec) };
}

/** The single next-most-important missing answer. */
export function nextQuestion(spec: JobSpec): string | null {
  if (!spec.sourceType) return "What kind of leads are you after?";
  if (spec.sourceType === "upload") return null;
  if (spec.sourceType === "records" && !spec.recordType) {
    return "Which record type should I pull?";
  }
  if (spec.sourceType === "business" && !spec.niches.length && !spec.targetUrl) {
    return "Which kind of business should I look for?";
  }
  if (!spec.counties.length && !spec.city && !spec.country && !spec.zips.length) {
    const states = specStates(spec);
    return states.length
      ? `Which counties in ${states.join(", ")}? I never widen a run to a whole state on your behalf, so tell me the counties and I'll price only those.`
      : "Which county, city, or state should I cover?";
  }
  return null;
}

/**
 * The model sometimes suggests a step the spec already has ("you'd need to add
 * skip tracing") which reads as a contradiction next to the panel. Drop any
 * sentence whose suggestion is already true in the spec.
 */
export function reconcileWithSpec(reply: string, spec: JobSpec): string {
  const contradictions: Array<{ on: boolean; re: RegExp }> = [
    { on: spec.skipTrace, re: /\b(add|enable|turn on|need)\b[^.!?]*\bskip[- ]?trac/i },
    { on: spec.mobileOnly, re: /\b(add|enable|turn on|need)\b[^.!?]*\bmobile[- ]?(only|verif)/i },
  ];
  return reply
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => !contradictions.some((c) => c.on && c.re.test(sentence)))
    .join(" ")
    .trim();
}

/**
 * The spoken part of the turn. Always non-empty when the spec changed, so the
 * panel can never move without the assistant saying so.
 */
export function speakTurn(opts: {
  modelReply: string;
  spec: JobSpec;
  priorSpec: JobSpec;
  userTexts: string[];
  /** Plain-language list of fields the operator hand-edited in the panel. */
  panelEdits?: string[];
}): { reply: string; complete: boolean; question: string | null } {
  const { captured, inferred, question } = turnFields({
    spec: opts.spec,
    priorSpec: opts.priorSpec,
    userTexts: opts.userTexts,
  });
  const lines: string[] = [];

  if (opts.panelEdits?.length) {
    lines.push(`I see you changed ${opts.panelEdits.join(", ")} in the List Builder — I'm working from that.`);
  }
  const model = reconcileWithSpec(opts.modelReply, opts.spec).trim();
  if (model) lines.push(model);

  if (captured.length) lines.push(`Got it — ${captured.join(", ")}.`);
  if (inferred.length) {
    lines.push(
      `You didn't specify ${inferred.join("; ")}, so that's my assumption — change it on the right if you want something different.`,
    );
  }
  if (question) lines.push(question);
  else if (captured.length) {
    lines.push("That's the full spec. Read it back on the right, correct anything, then Looks Good when it matches.");
  }
  if (!lines.length) lines.push("Say a little more about the leads you want.");

  return { reply: lines.join("\n\n"), complete: !question && captured.length > 0, question };
}
