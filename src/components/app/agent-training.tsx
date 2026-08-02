// ---------------------------------------------------------------------------
// The primary training surface. One box: paste anything, attach files, dictate,
// or drop a link. We file it into the right knowledge category behind the
// scenes so users think about teaching, never about taxonomy.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Mic, MicOff, Paperclip, Loader2, Trash2, Sparkles, Link2, FolderInput, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addBotKnowledge, addBotKnowledgeFromUrls } from "@/lib/bot-training.functions";
import { deleteBotKnowledge } from "@/lib/bot-training.functions";
import { TEXTUAL_FILE, type KnowledgeItem } from "@/lib/knowledge-cards.shared";
import {
  TRAINING_EXAMPLES, classifyKnowledge, extractUrls, isUrlOnly,
} from "@/lib/agent-intelligence.shared";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

function getRecognition(): SpeechRecognitionLike | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export function AgentComposer({ brandId }: { brandId: string }) {
  const qc = useQueryClient();
  const add = useServerFn(addBotKnowledge);
  const addUrls = useServerFn(addBotKnowledgeFromUrls);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const areaRef = useRef<HTMLTextAreaElement | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["bot-knowledge", `brand:${brandId}`] });

  useEffect(() => () => recRef.current?.stop(), []);

  // Live filing preview — the user sees where it's going before they commit.
  const routed = useMemo(() => (text.trim().length > 12 ? classifyKnowledge(text) : null), [text]);
  const crawling = useMemo(() => isUrlOnly(text), [text]);

  const toggleMic = () => {
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = getRecognition();
    if (!rec) return toast.error("Dictation Not Supported In This Browser");
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let chunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) chunk += e.results[i][0].transcript;
      if (chunk.trim()) setText((prev) => (prev ? `${prev.trim()} ${chunk.trim()}` : chunk.trim()));
    };
    rec.onerror = () => {
      setListening(false);
      toast.error("Microphone Error");
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };

  const useExample = (t: string) => {
    setText((prev) => (prev.trim() ? `${prev.trim()}\n\n${t}` : t));
    areaRef.current?.focus();
  };

  const train = async () => {
    const body = text.trim();
    if (!body) return;
    setBusy(true);
    try {
      // Pure links are a crawl, not a note — read the pages instead of storing the URL.
      if (isUrlOnly(body)) {
        const urls = extractUrls(body).slice(0, 10);
        const res = await addUrls({ data: { brandId, category: "website", urls } });
        if (res.added) {
          setText("");
          toast.success(`${res.added} Page${res.added === 1 ? "" : "s"} Learned`, {
            description: "Filed Under Website.",
          });
        }
        for (const f of res.failed) toast.error(f.url, { description: f.reason });
        refresh();
        return;
      }

      const routing = classifyKnowledge(body);
      await add({
        data: {
          brandId,
          items: [
            {
              source_type: listening ? ("voice" as const) : routing.sourceType,
              category: routing.category,
              title: routing.title,
              content: body,
            },
          ],
        },
      });
      setText("");
      refresh();
      toast.success("Agent Trained", { description: `Filed Under ${routing.label}.` });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save Failed");
    } finally {
      setBusy(false);
    }
  };

  const attach = async (files: File[]) => {
    const usable = files.filter((f) => TEXTUAL_FILE.test(f.name) || f.type.startsWith("text/"));
    if (!usable.length) {
      return toast.error("Unsupported Files", {
        description: "Upload TXT, MD, CSV, JSON, HTML, XML, VTT Or SRT. Export PDFs To Text First.",
      });
    }
    setBusy(true);
    try {
      const items = await Promise.all(
        usable.slice(0, 25).map(async (f) => {
          const content = (await f.text()).slice(0, 200000);
          // Same filing logic as pasted text, so an uploaded transcript
          // doesn't get buried under generic Documents.
          const routing = classifyKnowledge(content);
          return {
            source_type: "file" as const,
            category: routing.category,
            title: f.name.slice(0, 160),
            content,
          };
        }),
      );
      const res = await add({ data: { brandId, items: items.filter((i) => i.content.trim().length > 0) } });
      toast.success(`${res.added} File${res.added === 1 ? "" : "s"} Added`, { description: "Sorted Automatically." });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="rounded-2xl border border-border bg-surface p-3 shadow-sm transition focus-within:border-primary/50">
        <Textarea
          ref={areaRef}
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste anything — what you do, your FAQs, a sales script, a call transcript, or just your website link…"
          className="min-h-[110px] resize-none border-0 bg-transparent px-1 py-1 text-[15px] shadow-none focus-visible:ring-0"
        />
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-full px-2.5 text-muted-foreground"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="mr-1 h-3.5 w-3.5" /> Attach Files
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-full px-2.5 text-muted-foreground"
            onClick={() => {
              setText((prev) => (prev.trim() ? prev : "https://"));
              areaRef.current?.focus();
            }}
          >
            <Link2 className="mr-1 h-3.5 w-3.5" /> Paste Website
          </Button>
          <Button
            type="button"
            size="sm"
            variant={listening ? "default" : "ghost"}
            className={`h-8 rounded-full px-2.5 ${listening ? "" : "text-muted-foreground"}`}
            onClick={toggleMic}
          >
            {listening ? <><MicOff className="mr-1 h-3.5 w-3.5" /> Stop</> : <><Mic className="mr-1 h-3.5 w-3.5" /> Start Dictating</>}
          </Button>
          {listening && (
            <span className="flex items-center gap-1 text-[11px] text-primary">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" /> Listening
            </span>
          )}
          <Button size="sm" className="ml-auto h-8 rounded-full" disabled={busy || !text.trim()} onClick={train}>
            {busy ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
            Train Agent
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          accept=".txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.xml,.vtt,.srt,.log,.yml,.yaml,text/*"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            e.currentTarget.value = "";
            if (files.length) void attach(files);
          }}
        />
      </div>

      {routed ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <FolderInput className="h-3.5 w-3.5 text-primary" />
          {crawling ? (
            <>We'll Read Those Pages And File Them Under <span className="font-semibold text-foreground">Website</span>.</>
          ) : (
            <>We'll File This Under <span className="font-semibold text-foreground">{routed.label}</span> — You Don't Have To Choose.</>
          )}
        </div>
      ) : (
        <div className="mt-2.5">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Examples</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {TRAINING_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => useExample(ex.text)}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/50 hover:text-foreground"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "Just Now";
  if (mins < 60) return `${mins} Minutes Ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} Hour${hours === 1 ? "" : "s"} Ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} Days Ago`;
}

const VERBS: Record<string, string> = {
  website: "Website Crawled",
  documents: "Document Added",
  calls: "Call Transcript Added",
  scripts: "Sales Script Added",
  faqs: "FAQs Imported",
  videos: "Video Transcript Added",
  emails: "Email Thread Added",
  catalog: "Product Catalog Added",
};

/** Commit-style training history — each entry tells part of the story. */
export function RecentTraining({ brandId, sources }: { brandId: string; sources: KnowledgeItem[] }) {
  const qc = useQueryClient();
  const remove = useServerFn(deleteBotKnowledge);
  const [all, setAll] = useState(false);
  const rows = all ? sources : sources.slice(0, 6);

  const del = async (id: string) => {
    try {
      await remove({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["bot-knowledge", `brand:${brandId}`] });
      toast.success("Source Removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete Failed");
    }
  };

  if (!sources.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        Nothing Trained Yet — Your Agent's History Starts With Your First Paste.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <ol className="relative space-y-4 pl-6">
        {/* The timeline spine */}
        <span className="absolute left-[9px] top-1.5 bottom-1.5 w-px bg-border" aria-hidden />
        {rows.map((s) => (
          <li key={s.id} className="group relative">
            <span className="absolute -left-6 top-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full border border-success/30 bg-success/10">
              <Check className="h-3 w-3 text-success" />
            </span>
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {VERBS[s.category] ?? "Knowledge Added"}
                </div>
                <div className="truncate text-xs text-muted-foreground">{s.title}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground/80">
                  {s.chars.toLocaleString()} Chars · {ago(s.created_at)}
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 opacity-0 transition group-hover:opacity-100"
                onClick={() => del(s.id)}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </li>
        ))}
      </ol>
      {sources.length > 6 && (
        <Button variant="ghost" size="sm" className="mt-2 h-7 rounded-full px-2 text-xs" onClick={() => setAll(!all)}>
          {all ? "Show Less" : `Show All ${sources.length}`}
        </Button>
      )}
    </div>
  );
}
