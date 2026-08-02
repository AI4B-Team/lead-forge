// Shared, client-safe definitions for the AI Agent's Knowledge Source cards.

export type KnowledgeMode = "urls" | "files" | "text" | "faq" | "video";

export type KnowledgeItem = {
  id: string;
  source_type: string;
  category: string;
  title: string;
  source_url: string | null;
  created_at: string;
  chars: number;
  excerpt: string;
};

export type KnowledgeCardSpec = {
  key: string;
  title: string;
  action: string;
  lines: string[];
  modes: KnowledgeMode[];
  addLabel: string;
  helper: string;
  unit: string;
  defaultTitle: string;
  textLabel: string;
  textPlaceholder: string;
  fileHint: string;
  textSourceType: "text" | "voice" | "file";
};

/** Files whose text we can read directly in the browser. */
export const TEXTUAL_FILE = /\.(txt|md|markdown|csv|tsv|json|html?|xml|vtt|srt|log|ya?ml)$/i;

export function faqPairsToContent(pairs: { q: string; a: string }[]): string {
  return pairs
    .map((p) => `Q: ${p.q.trim()}\nA: ${p.a.trim()}`)
    .join("\n\n")
    .slice(0, 200000);
}

export const KNOWLEDGE_CARDS: KnowledgeCardSpec[] = [
  {
    key: "website",
    title: "Website",
    action: "Crawl Public Pages",
    lines: ["Services & Pricing", "About & Contact", "Service Areas"],
    modes: ["urls"],
    addLabel: "Add Website Pages",
    helper: "Point The Agent At Public Pages — We Read The Text And Store It As Knowledge.",
    unit: "Page",
    defaultTitle: "Website Page",
    textLabel: "Page Text",
    textPlaceholder: "",
    fileHint: "",
    textSourceType: "text",
  },
  {
    key: "documents",
    title: "Documents",
    action: "Upload Or Paste",
    lines: ["Brochures & Spec Sheets", "Warranty Terms", "Service Agreements"],
    modes: ["files", "text"],
    addLabel: "Add Documents",
    helper: "Upload Text Documents Or Paste Their Contents.",
    unit: "Document",
    defaultTitle: "Document",
    textLabel: "Document Text",
    textPlaceholder: "Paste the document contents…",
    fileHint: "TXT, MD, CSV, JSON, HTML, XML",
    textSourceType: "file",
  },
  {
    key: "calls",
    title: "Call Recordings",
    action: "Add Transcripts",
    lines: ["Real Objection Handling", "Your Actual Tone", "Winning Phrasing"],
    modes: ["text", "files"],
    addLabel: "Add Call Transcripts",
    helper: "Paste A Call Transcript Or Upload A Caption / Transcript File.",
    unit: "Transcript",
    defaultTitle: "Call Transcript",
    textLabel: "Transcript",
    textPlaceholder: "Rep: Thanks for calling…\nCustomer: I'm just looking for a price…",
    fileHint: "TXT, VTT, SRT, JSON Transcripts",
    textSourceType: "voice",
  },
  {
    key: "scripts",
    title: "Sales Scripts",
    action: "Paste Or Upload",
    lines: ["Qualifying Questions", "Rebuttals", "Booking Language"],
    modes: ["text", "files"],
    addLabel: "Add Sales Scripts",
    helper: "Give The Agent The Language You Want It To Use.",
    unit: "Script",
    defaultTitle: "Sales Script",
    textLabel: "Script",
    textPlaceholder: "Opener, qualifying questions, rebuttals, close…",
    fileHint: "TXT, MD, CSV, JSON",
    textSourceType: "text",
  },
  {
    key: "faqs",
    title: "FAQs",
    action: "Add Approved Answers",
    lines: ["Pricing Questions", "Timeline Questions", "Guarantees"],
    modes: ["faq", "text"],
    addLabel: "Add FAQs",
    helper: "Enter Question And Approved Answer Pairs — The Agent Won't Improvise Around Them.",
    unit: "FAQ Set",
    defaultTitle: "Approved FAQs",
    textLabel: "FAQ Text",
    textPlaceholder: "Q: Do you offer financing?\nA: Yes — 0% for 12 months on approved credit.",
    fileHint: "TXT, MD, CSV",
    textSourceType: "text",
  },
  {
    key: "videos",
    title: "Videos",
    action: "Add Transcripts",
    lines: ["Walkthroughs & Demos", "Testimonials", "Explainer Content"],
    modes: ["video", "files"],
    addLabel: "Add Video Knowledge",
    helper: "Link The Video And Add Its Transcript Or Caption File.",
    unit: "Video",
    defaultTitle: "Video Transcript",
    textLabel: "Transcript",
    textPlaceholder: "Paste the transcript or captions text…",
    fileHint: "VTT, SRT, TXT Captions",
    textSourceType: "text",
  },
  {
    key: "emails",
    title: "Emails",
    action: "Paste Threads",
    lines: ["Follow-Up Cadence", "Proven Replies", "Common Questions"],
    modes: ["text", "files"],
    addLabel: "Add Email Threads",
    helper: "Paste Real Threads So The Agent Mirrors Replies That Already Work.",
    unit: "Thread",
    defaultTitle: "Email Thread",
    textLabel: "Thread",
    textPlaceholder: "Paste the email thread (strip anything private)…",
    fileHint: "TXT, MD, CSV, JSON Exports",
    textSourceType: "text",
  },
  {
    key: "catalog",
    title: "Product Catalog",
    action: "Upload CSV Or Paste",
    lines: ["Products & Packages", "Pricing & Warranties", "Add-Ons"],
    modes: ["files", "text"],
    addLabel: "Add Product Catalog",
    helper: "Upload A CSV Of Products Or Paste Your Package List With Pricing.",
    unit: "Catalog",
    defaultTitle: "Product Catalog",
    textLabel: "Products",
    textPlaceholder: "Package · Price · What's Included · Warranty",
    fileHint: "CSV, TSV, JSON, TXT",
    textSourceType: "file",
  },
];