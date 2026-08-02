// ---------------------------------------------------------------------------
// Knowledge Sources — the working training interface. Every card is an input:
// crawl a site, upload documents, paste transcripts, enter approved Q/A pairs.
// Everything written here lands in bot_knowledge under the workspace agent, so
// the inbound reply bot's knowledge brief picks it up automatically.
// ---------------------------------------------------------------------------

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Globe,
  HelpCircle,
  Headphones,
  Mail,
  MessageSquareQuote,
  Package,
  Plus,
  Trash2,
  UploadCloud,
  Video,
  Check,
  Loader2,
  Lock,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  addBotKnowledge,
  addBotKnowledgeFromUrls,
  deleteBotKnowledge,
} from "@/lib/bot-training.functions";
import {
  KNOWLEDGE_CARDS,
  TEXTUAL_FILE,
  faqPairsToContent,
  type KnowledgeCardSpec,
  type KnowledgeItem,
} from "@/lib/knowledge-cards.shared";
import { OPEN_KNOWLEDGE_EVENT, depthLabel, sourceDepths } from "@/lib/agent-readiness";

const ICONS: Record<string, LucideIcon> = {
  website: Globe,
  documents: FileText,
  calls: Headphones,
  scripts: MessageSquareQuote,
  faqs: HelpCircle,
  videos: Video,
  emails: Mail,
  catalog: Package,
};

function AddSourceDialog({
  spec,
  brandId,
  items,
  trigger = "card",
}: {
  spec: KnowledgeCardSpec;
  brandId: string;
  items: KnowledgeItem[];
  trigger?: "card" | "row";
}) {
  const qc = useQueryClient();
  const add = useServerFn(addBotKnowledge);
  const addUrls = useServerFn(addBotKnowledgeFromUrls);
  const remove = useServerFn(deleteBotKnowledge);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [urls, setUrls] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [pairs, setPairs] = useState<{ q: string; a: string }[]>([{ q: "", a: "" }]);

  // Lets the readiness suggestion open this exact source's Add flow.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const key = (e as CustomEvent<{ key?: string }>).detail?.key;
      if (key === spec.key) setOpen(true);
    };
    window.addEventListener(OPEN_KNOWLEDGE_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_KNOWLEDGE_EVENT, onOpen);
  }, [spec.key]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["bot-knowledge", `brand:${brandId}`] });

  const reset = () => {
    setTitle("");
    setText("");
    setUrls("");
    setVideoUrl("");
    setPairs([{ q: "", a: "" }]);
  };

  const saveUrls = async () => {
    const parsed = urls
      .split(/[\s,]+/)
      .map((u) => u.trim())
      .filter(Boolean)
      .map((u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`));
    if (!parsed.length) return toast.error("Add At Least One URL");
    setBusy(true);
    try {
      const res = await addUrls({ data: { brandId, category: spec.key, urls: parsed.slice(0, 10) } });
      if (res.added) toast.success(`${res.added} Page${res.added === 1 ? "" : "s"} Learned`);
      for (const f of res.failed) toast.error(f.url, { description: f.reason });
      reset();
      refresh();
      if (res.added) setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Crawl Failed");
    } finally {
      setBusy(false);
    }
  };

  const saveFiles = async (files: File[]) => {
    const usable = files.filter((f) => TEXTUAL_FILE.test(f.name) || f.type.startsWith("text/"));
    const skipped = files.length - usable.length;
    if (!usable.length) {
      return toast.error("Unsupported Files", {
        description: "Upload TXT, MD, CSV, JSON, HTML, XML, VTT, Or SRT. Export PDFs / Word Docs To Text First.",
      });
    }
    setBusy(true);
    try {
      const built = await Promise.all(
        usable.slice(0, 25).map(async (f) => ({
          source_type: "file" as const,
          category: spec.key,
          title: f.name.slice(0, 160),
          content: (await f.text()).slice(0, 200000),
        })),
      );
      const res = await add({ data: { brandId, items: built.filter((i) => i.content.trim().length > 0) } });
      toast.success(`${res.added} File${res.added === 1 ? "" : "s"} Added`, {
        description: skipped ? `${skipped} Unsupported File${skipped === 1 ? "" : "s"} Skipped.` : undefined,
      });
      refresh();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload Failed");
    } finally {
      setBusy(false);
    }
  };

  const saveText = async () => {
    if (!text.trim()) return toast.error("Nothing To Save Yet");
    setBusy(true);
    try {
      await add({
        data: {
          brandId,
          items: [
            {
              source_type: spec.textSourceType,
              category: spec.key,
              title: title.trim() || spec.defaultTitle,
              content: text,
              ...(spec.modes.includes("video") && videoUrl.trim() ? { source_url: videoUrl.trim() } : {}),
            },
          ],
        },
      });
      toast.success(`${spec.title} Added`);
      reset();
      refresh();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save Failed");
    } finally {
      setBusy(false);
    }
  };

  const saveFaqs = async () => {
    const clean = pairs.filter((p) => p.q.trim() && p.a.trim());
    if (!clean.length) return toast.error("Add At Least One Question And Approved Answer");
    setBusy(true);
    try {
      await add({
        data: {
          brandId,
          items: [
            {
              source_type: "text" as const,
              category: spec.key,
              title: title.trim() || `Approved FAQs (${clean.length})`,
              content: faqPairsToContent(clean),
            },
          ],
        },
      });
      toast.success(`${clean.length} FAQ${clean.length === 1 ? "" : "s"} Added`);
      reset();
      refresh();
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save Failed");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    try {
      await remove({ data: { id } });
      refresh();
      toast.success("Source Removed");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete Failed");
    }
  };

  const tabs = [...spec.modes, ...(items.length ? (["added"] as const) : [])];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger === "row" ? (
          <Button size="sm" variant="ghost" className="h-8 shrink-0 rounded-full px-3 text-xs text-primary">
            {items.length ? "Manage" : "Add"} <ChevronRight className="ml-0.5 h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" variant="outline" className="mt-4 w-full rounded-full">
            <Plus className="mr-1 h-3.5 w-3.5" /> {spec.addLabel}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{spec.addLabel}</DialogTitle>
          <DialogDescription>{spec.helper}</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={tabs[0]}>
          {tabs.length > 1 && (
            <TabsList className="flex-wrap">
              {spec.modes.includes("urls") && <TabsTrigger value="urls">Website URLs</TabsTrigger>}
              {spec.modes.includes("video") && <TabsTrigger value="video">Video Link</TabsTrigger>}
              {spec.modes.includes("text") && <TabsTrigger value="text">Paste</TabsTrigger>}
              {spec.modes.includes("faq") && <TabsTrigger value="faq">Question & Answer</TabsTrigger>}
              {spec.modes.includes("files") && <TabsTrigger value="files">Upload</TabsTrigger>}
              {items.length > 0 && <TabsTrigger value="added">Added ({items.length})</TabsTrigger>}
            </TabsList>
          )}

          {spec.modes.includes("urls") && (
            <TabsContent value="urls" className="space-y-3 pt-4">
              <div>
                <Label>Public Pages (One Per Line)</Label>
                <Textarea
                  rows={4}
                  value={urls}
                  onChange={(e) => setUrls(e.target.value)}
                  placeholder={"https://yourbrand.com/about\nhttps://yourbrand.com/pricing"}
                  className="mt-1"
                />
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Up To 10 Pages Per Batch · Readable Text Only — No Logins.
                </div>
              </div>
              <div className="flex justify-end">
                <Button className="rounded-full" onClick={saveUrls} disabled={busy || !urls.trim()}>
                  {busy ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Reading Pages…</> : "Crawl & Learn"}
                </Button>
              </div>
            </TabsContent>
          )}

          {spec.modes.includes("video") && (
            <TabsContent value="video" className="space-y-3 pt-4">
              <div>
                <Label>Video Link (YouTube Or Loom)</Label>
                <Input
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=…"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Transcript</Label>
                <Textarea
                  rows={7}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Paste the transcript or captions text…"
                  className="mt-1"
                />
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Paste The Transcript, Or Upload A .VTT / .SRT Caption File On The Upload Tab.
                </div>
              </div>
              <div className="flex justify-end">
                <Button className="rounded-full" onClick={saveText} disabled={busy || !text.trim()}>
                  {busy ? "Saving…" : "Add Transcript"}
                </Button>
              </div>
            </TabsContent>
          )}

          {spec.modes.includes("text") && (
            <TabsContent value="text" className="space-y-3 pt-4">
              <div>
                <Label>Title (Optional)</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={spec.defaultTitle} className="mt-1" />
              </div>
              <div>
                <Label>{spec.textLabel}</Label>
                <Textarea
                  rows={8}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={spec.textPlaceholder}
                  className="mt-1"
                />
              </div>
              <div className="flex justify-end">
                <Button className="rounded-full" onClick={saveText} disabled={busy || !text.trim()}>
                  {busy ? "Saving…" : "Add To Knowledge"}
                </Button>
              </div>
            </TabsContent>
          )}

          {spec.modes.includes("faq") && (
            <TabsContent value="faq" className="space-y-3 pt-4">
              <div className="max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                {pairs.map((p, i) => (
                  <div key={i} className="rounded-xl border border-border p-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Question {i + 1}</Label>
                      {pairs.length > 1 && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setPairs(pairs.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                    <Input
                      value={p.q}
                      onChange={(e) => setPairs(pairs.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                      placeholder="Do You Offer Financing?"
                      className="mt-1"
                    />
                    <Textarea
                      rows={3}
                      value={p.a}
                      onChange={(e) => setPairs(pairs.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                      placeholder="Approved answer the agent is allowed to give…"
                      className="mt-2"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setPairs([...pairs, { q: "", a: "" }])}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Another Question
                </Button>
                <Button className="rounded-full" onClick={saveFaqs} disabled={busy}>
                  {busy ? "Saving…" : "Add FAQs"}
                </Button>
              </div>
            </TabsContent>
          )}

          {spec.modes.includes("files") && (
            <TabsContent value="files" className="pt-4">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-8 text-center transition hover:border-primary/50">
                {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <UploadCloud className="h-6 w-6 text-primary" />}
                <div className="mt-2 font-display font-bold text-foreground">Drop Files Or Click To Upload</div>
                <div className="mt-1 text-xs text-muted-foreground">{spec.fileHint}</div>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  accept=".txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.xml,.vtt,.srt,.log,.yml,.yaml,text/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.currentTarget.value = "";
                    if (files.length) void saveFiles(files);
                  }}
                />
              </label>
              <div className="mt-2 text-[11px] text-muted-foreground">
                PDFs And Word Docs Aren't Parsed Yet — Export To Text, Or Use The Paste Tab.
              </div>
            </TabsContent>
          )}

          {items.length > 0 && (
            <TabsContent value="added" className="pt-4">
              <div className="divide-y divide-border rounded-xl border border-border">
                {items.map((s) => (
                  <div key={s.id} className="flex items-start gap-3 p-3">
                    <Badge variant="outline" className="shrink-0 text-[10px] uppercase">{s.source_type}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-foreground">{s.title}</div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">{s.excerpt}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => del(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The eight Knowledge Source cards — each one a live input that writes to the
 * agent's approved knowledge base. Without an agent yet, the cards explain what
 * they'll accept and point at the Create My Agent step.
 */
export function KnowledgeSourceCards({
  brandId,
  sources = [],
}: {
  brandId?: string;
  sources?: KnowledgeItem[];
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {KNOWLEDGE_CARDS.map((spec) => {
        const Icon = ICONS[spec.key] ?? FileText;
        const items = sources.filter((s) => s.category === spec.key);
        const chars = items.reduce((a, s) => a + s.chars, 0);
        const word = depthLabel(chars);
        return (
          <Card
            key={spec.key}
            id={`knowledge-card-${spec.key}`}
            className="group flex flex-col scroll-mt-24 transition hover:border-primary/60 hover:shadow-sm"
          >
            <CardContent className="flex flex-1 flex-col pt-6">
              <div className="flex items-start justify-between">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4.5 w-4.5" />
                </div>
                {items.length > 0 && <Check className="h-4 w-4 text-success" />}
              </div>
              <div className="mt-3 font-display font-bold text-foreground">{spec.title}</div>
              <div className="mt-0.5 text-xs font-semibold text-primary">{spec.action}</div>
              <ul className="mt-2.5 space-y-1">
                {spec.lines.map((l) => (
                  <li key={l} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-1 w-1 rounded-full bg-muted-foreground/50" /> {l}
                  </li>
                ))}
              </ul>

              <div className="mt-3 text-xs">
                {items.length === 0 ? (
                  <span className="text-muted-foreground/80">Not Added Yet</span>
                ) : (
                  <span className="font-medium text-foreground">
                    {items.length} {items.length === 1 ? spec.unit : `${spec.unit}s`}
                    {word && <span className="font-normal text-muted-foreground">{` · ${word}`}</span>}
                  </span>
                )}
              </div>

              <div className="mt-auto">
                {brandId ? (
                  <AddSourceDialog spec={spec} brandId={brandId} items={items} />
                ) : (
                  <Button size="sm" variant="outline" className="mt-4 w-full rounded-full" disabled>
                    <Lock className="mr-1 h-3.5 w-3.5" /> Create Your Agent First
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

/**
 * Compact "Improve Your Agent" list — every training source as one settings-style
 * row: icon, name, status, action. Same dialogs as the card grid.
 */
export function KnowledgeSourceList({
  brandId,
  sources = [],
}: {
  brandId?: string;
  sources?: KnowledgeItem[];
}) {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-card">
      {(() => {
        const depths = new Map(sourceDepths(sources).map((d) => [d.key, d]));
        return KNOWLEDGE_CARDS.map((spec) => {
        const Icon = ICONS[spec.key] ?? FileText;
        const items = sources.filter((s) => s.category === spec.key);
        const depth = depths.get(spec.key);
        const isAdded = !!depth?.covered;
        const isThin = !!depth?.thin;
        // Depth bar is a rough fullness cue only — never a quota to fill.
        const progress = depth ? Math.min(100, Math.round((depth.chars / 3000) * 100)) : 0;
        return (
          <div
            key={spec.key}
            id={`knowledge-card-${spec.key}`}
            className="group flex scroll-mt-24 items-center gap-4 px-4 py-3"
          >
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                isAdded
                  ? "bg-success/10 text-success"
                  : isThin
                    ? "bg-warn/10 text-warn"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <Icon className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="truncate text-sm font-semibold text-foreground">{spec.title}</div>
                {isAdded && <Check className="h-3.5 w-3.5 text-success" />}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {depth && depth.count > 0 ? (
                  isThin ? <span className="text-warn">{depth.detail}</span> : <>{depth.detail}</>
                ) : (
                  <>None Yet · {spec.action}</>
                )}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${isAdded ? "bg-success" : "bg-warn"}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="shrink-0 pl-2">
              {brandId ? (
                <AddSourceDialog spec={spec} brandId={brandId} items={items} trigger="row" />
              ) : (
                <Button size="sm" variant="ghost" className="h-8 shrink-0 rounded-full px-3 text-xs" disabled>
                  <Lock className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        );
        });
      })()}
    </div>
  );
}