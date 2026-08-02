import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BrainCircuit, FileText, Link2, Mic, MicOff, Trash2, Type, UploadCloud, Loader2 } from "lucide-react";
import {
  addBotKnowledge,
  addBotKnowledgeFromUrls,
  deleteBotKnowledge,
  listBotKnowledge,
} from "@/lib/bot-training.functions";

const TEXTUAL = /\.(txt|md|markdown|csv|tsv|json|html?|xml|vtt|srt|log|yml|yaml)$/i;

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
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/**
 * Agent training console — feed the workspace AI agent your voice through
 * pasted text, dictation, single/batch file upload, or public URLs.
 * Everything stored here becomes the bot's approved source of truth.
 */
export function BotTrainer({
  campaignId,
  brandId,
  heading = "Train Your AI Agent",
}: {
  campaignId?: string;
  brandId?: string;
  heading?: string;
}) {
  const scope = brandId ? { brandId } : { campaignId: campaignId! };
  const scopeKey = brandId ? `brand:${brandId}` : `campaign:${campaignId}`;
  const qc = useQueryClient();
  const list = useServerFn(listBotKnowledge);
  const add = useServerFn(addBotKnowledge);
  const addUrls = useServerFn(addBotKnowledgeFromUrls);
  const remove = useServerFn(deleteBotKnowledge);

  const { data: sources, isLoading } = useQuery({
    queryKey: ["bot-knowledge", scopeKey],
    queryFn: () => list({ data: scope }),
  });

  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [urls, setUrls] = useState("");
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const dragRef = useRef<HTMLLabelElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const refresh = () => qc.invalidateQueries({ queryKey: ["bot-knowledge", scopeKey] });

  useEffect(() => () => recRef.current?.stop(), []);

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
    toast.message("Listening…", { description: "Speak Your Business Details. Tap The Mic To Stop." });
  };

  const saveText = async (kind: "text" | "voice") => {
    if (!text.trim()) return toast.error("Nothing To Save Yet");
    setBusy(true);
    try {
      await add({
        data: {
          ...scope,
          items: [{ source_type: kind, title: title.trim() || (kind === "voice" ? "Dictated Agent Notes" : "Agent Notes"), content: text }],
        },
      });
      toast.success("Bot Trained");
      setText("");
      setTitle("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save Failed");
    } finally {
      setBusy(false);
    }
  };

  const ingestFiles = useCallback(
    async (files: File[]) => {
      const usable = files.filter((f) => TEXTUAL.test(f.name) || f.type.startsWith("text/"));
      const skipped = files.length - usable.length;
      if (!usable.length) {
        return toast.error("Unsupported Files", {
          description: "Upload TXT, MD, CSV, JSON, HTML, or XML. Export PDFs / DOCX To Text First.",
        });
      }
      setBusy(true);
      try {
        const items = await Promise.all(
          usable.slice(0, 25).map(async (f) => ({
            source_type: "file" as const,
            title: f.name.slice(0, 160),
            content: (await f.text()).slice(0, 200000),
          })),
        );
        const res = await add({ data: { ...scope, items: items.filter((i) => i.content.trim().length > 0) } });
        toast.success(`${res.added} File${res.added === 1 ? "" : "s"} Added`, {
          description: skipped ? `${skipped} Unsupported File${skipped === 1 ? "" : "s"} Skipped.` : undefined,
        });
        refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Upload Failed");
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scopeKey],
  );

  const saveUrls = async () => {
    const parsed = urls
      .split(/[\s,]+/)
      .map((u) => u.trim())
      .filter(Boolean)
      .map((u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`));
    if (!parsed.length) return toast.error("Add At Least One URL");
    setBusy(true);
    try {
      const res = await addUrls({ data: { ...scope, urls: parsed.slice(0, 10) } });
      if (res.added) toast.success(`${res.added} Page${res.added === 1 ? "" : "s"} Learned`);
      for (const f of res.failed) toast.error(f.url, { description: f.reason });
      setUrls("");
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Crawl Failed");
    } finally {
      setBusy(false);
    }
  };

  const del = async (id: string) => {
    try {
      await remove({ data: { id } });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete Failed");
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-primary" /> {heading}
        </CardTitle>
        <Badge variant="outline" className="text-[10px] uppercase">
          {(sources ?? []).length} Source{(sources ?? []).length === 1 ? "" : "s"} Added
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="text">
          <TabsList className="flex-wrap">
            <TabsTrigger value="text" className="gap-1"><Type className="h-3.5 w-3.5" /> Text & Voice</TabsTrigger>
            <TabsTrigger value="files" className="gap-1"><FileText className="h-3.5 w-3.5" /> Files</TabsTrigger>
            <TabsTrigger value="urls" className="gap-1"><Link2 className="h-3.5 w-3.5" /> URLs</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-3 pt-4">
            <div>
              <Label>Source Title (Optional)</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Voice & Offer Notes" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <Label>Agent Knowledge</Label>
                <Button
                  type="button"
                  size="sm"
                  variant={listening ? "default" : "outline"}
                  className="rounded-full h-8"
                  onClick={toggleMic}
                >
                  {listening ? <><MicOff className="mr-1 h-3.5 w-3.5" /> Stop</> : <><Mic className="mr-1 h-3.5 w-3.5" /> Speak</>}
                </Button>
              </div>
              <Textarea
                rows={6}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Who you are, what you offer, how you talk, what you never promise, common objections and the approved answers…"
                className="mt-1"
              />
              {listening && (
                <div className="text-[11px] text-primary mt-1 flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-primary animate-pulse" /> Listening — Speak Naturally.
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" className="rounded-full" disabled={busy || !text.trim()} onClick={() => saveText("voice")}>
                Save As Dictation
              </Button>
              <Button className="rounded-full" disabled={busy || !text.trim()} onClick={() => saveText("text")}>
                Train Bot
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="files" className="pt-4">
            <label
              ref={dragRef}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                void ingestFiles(Array.from(e.dataTransfer.files));
              }}
              className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
            >
              {busy ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <UploadCloud className="h-6 w-6 text-primary" />}
              <div className="mt-2 font-display font-bold text-foreground">Drop Files Or Click To Upload</div>
              <div className="text-xs text-muted-foreground mt-1">
                Single Or Batch · Up To 25 Files · TXT, MD, CSV, JSON, HTML, XML
              </div>
              <input
                type="file"
                multiple
                className="hidden"
                accept=".txt,.md,.markdown,.csv,.tsv,.json,.html,.htm,.xml,.vtt,.srt,.log,.yml,.yaml,text/*"
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  e.currentTarget.value = "";
                  if (files.length) void ingestFiles(files);
                }}
              />
            </label>
            <div className="text-[11px] text-muted-foreground mt-2">
              PDFs And Word Docs Aren't Parsed Yet — Export To Text, Or Paste The Content On The Text Tab.
            </div>
          </TabsContent>

          <TabsContent value="urls" className="space-y-3 pt-4">
            <div>
              <Label>Public URLs (One Per Line)</Label>
              <Textarea
                rows={4}
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                placeholder={"https://yourbrand.com/about\nhttps://yourbrand.com/faq"}
                className="mt-1"
              />
              <div className="text-[11px] text-muted-foreground mt-1">Up To 10 Pages Per Batch. Readable Text Only — No Logins.</div>
            </div>
            <div className="flex justify-end">
              <Button className="rounded-full" onClick={saveUrls} disabled={busy || !urls.trim()}>
                {busy ? "Learning…" : "Learn From URLs"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <div className="rounded-xl border border-border">
          <div className="px-4 py-2 text-xs uppercase tracking-wider font-semibold text-muted-foreground border-b border-border">
            Knowledge Base
          </div>
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading Sources…</div>
          ) : !sources?.length ? (
            <div className="p-4 text-sm text-muted-foreground">No Sources Yet. The Bot Only Uses Approved Material.</div>
          ) : (
            <div className="divide-y divide-border">
              {sources.map((s) => (
                <div key={s.id} className="flex items-start gap-3 p-3">
                  <Badge variant="outline" className="uppercase text-[10px] shrink-0">{s.source_type}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-foreground truncate">{s.title}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{s.excerpt}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      {new Date(s.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => del(s.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
