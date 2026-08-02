import { describe, expect, it } from "vitest";
import { agentIntelligence, classifyKnowledge, extractUrls, intelligenceTier, isUrlOnly } from "./agent-intelligence.shared";
import type { KnowledgeItem } from "./knowledge-cards.shared";

const item = (category: string, chars: number): KnowledgeItem => ({
  id: Math.random().toString(36).slice(2),
  source_type: "text",
  category,
  title: "t",
  source_url: null,
  created_at: new Date().toISOString(),
  chars,
  excerpt: "",
});

describe("intelligence tiers", () => {
  it("maps each band to its own emotional label", () => {
    expect(intelligenceTier(14).label).toBe("Needs Training");
    expect(intelligenceTier(40).label).toBe("Learning");
    expect(intelligenceTier(75).label).toBe("Almost Ready");
    expect(intelligenceTier(95).label).toBe("Ready");
  });
});

describe("agent intelligence", () => {
  it("is zero with nothing trained", () => {
    const i = agentIntelligence([]);
    expect(i.score).toBe(0);
    expect(i.complete).toBe(0);
    expect(i.total).toBe(8);
  });
  it("rewards breadth over one huge dump", () => {
    const broad = agentIntelligence([item("faqs", 3000), item("website", 3000), item("scripts", 3000), item("emails", 3000)]);
    const deep = agentIntelligence([item("faqs", 12000)]);
    expect(broad.score).toBeGreaterThan(deep.score);
  });
  it("tracks per-category progress", () => {
    const i = agentIntelligence([item("faqs", 3000)]);
    const faqs = i.categories.find((c) => c.key === "faqs")!;
    expect(faqs.count).toBe(1);
    expect(faqs.progress).toBe(50);
    expect(i.categories.find((c) => c.key === "website")!.progress).toBe(0);
  });
});

describe("auto categorization", () => {
  it("routes Q/A pastes to FAQs", () => {
    expect(classifyKnowledge("Q: Do you finance?\nA: Yes, 0% for 12 months.").category).toBe("faqs");
  });
  it("routes a bare link to the website crawler", () => {
    expect(isUrlOnly("https://summitroofing.com/pricing")).toBe(true);
    expect(classifyKnowledge("summitroofing.com").category).toBe("website");
    expect(extractUrls("see summitroofing.com/about now")).toEqual(["https://summitroofing.com/about"]);
  });
  it("does not treat prose containing a link as a crawl", () => {
    expect(isUrlOnly("We install roofs, see https://x.com for details and pricing")).toBe(false);
  });
  it("routes transcripts, threads and catalogs", () => {
    expect(classifyKnowledge("Rep: Thanks for calling\nCustomer: what's the price\nRep: depends\nCustomer: ok").category).toBe("calls");
    expect(classifyKnowledge("Subject: Roof quote\nFrom: bob@x.com\n\nHi there").category).toBe("emails");
    expect(classifyKnowledge("Basic package $499 includes gutters\nPro $999 includes warranty\nElite $1,499 pricing").category).toBe("catalog");
  });
  it("falls back to notes for short prose", () => {
    expect(classifyKnowledge("We only serve Dallas County.").category).toBe("scripts");
  });
});
