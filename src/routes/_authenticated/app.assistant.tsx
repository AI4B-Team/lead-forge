import { z } from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { JobSpecCard } from "@/components/app/job-spec-card";
import { AssistantTrace, buildTraceSteps } from "@/components/app/assistant-trace";
import { AssistantSummary } from "@/components/app/assistant-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Sparkles, ChevronDown, Play, CornerDownLeft, SlidersHorizontal, CheckCircle2, RotateCcw } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { assistantChat, createJobFromSpec, requestCoverage } from "@/lib/assistant.functions";
import { runJob } from "@/lib/pipeline.functions";
import { EMPTY_SPEC, describeSpec, type AssistantMessage, type Coverage, type JobSpec } from "@/lib/assistant.shared";
import { TEMPLATES } from "@/lib/templates";
import { takeStashedPrompt, clearStashedPrompt } from "@/lib/prompt-handoff";

export const Route = createFileRoute("/_authenticated/app/assistant")({
  validateSearch: z.object({ prompt: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "AI Lead Assistant — LeadTrace" },
      { name: "description", content: "Describe the leads you want in plain English. The LeadTrace assistant assembles a compliant, runnable pipeline job you can review before running." },
      { property: "og:title", content: "AI Lead Assistant — LeadTrace" },
      { property: "og:description", content: "Watch the assistant interpret plain English into a structured, editable job spec. You always click Run." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Assistant,
});

const TRY_CHIPS = ["Probate Filings", "Roofers", "Code Violations", "Vacant Homes"];

function Assistant() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { workspaceId } = useWorkspaceId();
  const chat = useServerFn(assistantChat);
  const createJob = useServerFn(createJobFromSpec);
  const logRequest = useServerFn(requestCoverage);
  const runJobFn = useServerFn(runJob);

  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [spec, setSpec] = useState<JobSpec>(EMPTY_SPEC);
  const [firstPrompt, setFirstPrompt] = useState("");
  const [coverage, setCoverage] = useState<Array<{ county: string; coverage: Coverage }>>([]);
  const [estimate, setEstimate] = useState<{ rows: number; skipTraceCredits: number; scrapeCredits: number } | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [revealed, setRevealed] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);
  const sentPrompt = useRef(false);
  const composer = useRef<HTMLTextAreaElement>(null);

  // Nothing has been assembled yet → the AI is the only thing on screen.
  const started = messages.length > 0;
  const traceSteps = useMemo(() => buildTraceSteps(spec), [spec]);
  const traceComplete = revealed >= traceSteps.length && !busy && traceSteps.length > 0;

  useEffect(() => {
    composer.current?.focus();
  }, [started]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  // Reveal the reasoning trail one row at a time so assembly feels live.
  useEffect(() => {
    if (busy || traceSteps.length === 0) return;
    if (revealed >= traceSteps.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 260);
    return () => clearTimeout(t);
  }, [busy, revealed, traceSteps.length]);

  const send = async (text: string) => {
    const body = text.trim();
    if (!body || !workspaceId || busy) return;
    const history = messages;
    if (!firstPrompt) setFirstPrompt(body);
    setMessages((m) => [...m, { role: "user", content: body }]);
    setInput("");
    setBusy(true);
    setConfirmed(false);
    setRevealed(0);
    try {
      const res = await chat({ data: { workspaceId, message: body, history: history.slice(-12), spec } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      setSpec(res.spec);
      setCoverage(res.coverage);
      setEstimate(res.estimate);
      setSuggested(res.suggestedTemplates);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The Assistant Could Not Answer");
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    clearStashedPrompt();
    setMessages([]);
    setInput("");
    setSpec(EMPTY_SPEC);
    setFirstPrompt("");
    setCoverage([]);
    setEstimate(null);
    setSuggested([]);
    setConfirmed(false);
    setRevealed(0);
  };

  // Deep-link: the homepage prompt box carries its text in ?prompt=, with a
  // short-lived sessionStorage stash as the only fallback.
  useEffect(() => {
    if (sentPrompt.current || !workspaceId) return;
    const fromUrl = search.prompt?.trim();
    const stashed = takeStashedPrompt();
    const initial = fromUrl || stashed;
    if (!initial) return;
    sentPrompt.current = true;
    // Strip the param so a refresh (or a later visit) never re-sends it.
    if (fromUrl) navigate({ to: "/app/assistant", search: {}, replace: true });
    void send(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, search.prompt]);

  const uncovered = coverage.filter((c) => c.coverage === "requested" || c.coverage === "unknown");

  const request = async (county: string) => {
    if (!workspaceId) return;
    try {
      await logRequest({ data: { workspaceId, county, recordType: spec.recordType } });
      toast.success("County Request Logged");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Log Request");
    }
  };

  const reviewAndRun = async () => {
    if (!workspaceId) return;
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    if (spec.sourceType === "upload") {
      navigate({ to: "/app/new-job/upload" });
      return;
    }
    setRunning(true);
    try {
      const { jobId } = await createJob({ data: { workspaceId, spec, transcript: messages.slice(-40) } });
      toast.success("Job Queued. Running Pipeline…");
      navigate({ to: "/app/jobs/$jobId", params: { jobId } });
      runJobFn({ data: { jobId } }).catch((e) =>
        toast.error(e instanceof Error ? e.message : "Pipeline Failed"),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Queue Job");
    } finally {
      setRunning(false);
    }
  };

  const templateChips = (suggested.length
    ? TEMPLATES.filter((t) => suggested.some((s) => s.toLowerCase() === t.id.toLowerCase() || s.toLowerCase() === t.title.toLowerCase()))
    : []
  ).slice(0, 4);

  const ctaLabel = running
    ? "Queueing…"
    : !traceComplete
      ? "Building Preview…"
      : confirmed
        ? "Run Job"
        : "Looks Good";

  const specPanel = (
    <div className="space-y-4">
      {firstPrompt && <AssistantSummary prompt={firstPrompt} spec={spec} />}

      <Collapsible>
        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm hover:border-primary">
          <span className="flex items-center gap-2 font-medium text-foreground">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" /> Fine-Tune Every Field
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-4">
          <JobSpecCard spec={spec} onChange={setSpec} coverage={coverage} estimate={estimate} />
        </CollapsibleContent>
      </Collapsible>

      {uncovered.length > 0 && (
        <Card>
          <CardContent className="pt-5 text-sm">
            <div className="font-medium text-foreground">Not Covered Yet</div>
            <div className="mt-1 text-xs text-muted-foreground">
              We Don't Have An Adapter For These Yet. Log A Request And We'll Add It To The Backlog.
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {uncovered.map((c) => (
                <Button key={c.county} size="sm" variant="outline" className="rounded-full" onClick={() => request(c.county)}>
                  Request {c.county}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        className="w-full rounded-full"
        disabled={running || !spec.sourceType || !traceComplete}
        onClick={reviewAndRun}
      >
        {confirmed ? <Play className="mr-1 h-4 w-4" /> : <CheckCircle2 className="mr-1 h-4 w-4" />} {ctaLabel}
      </Button>
      <div className="text-center text-[11px] text-muted-foreground">
        The Assistant Assembles. You Run. Nothing Sends Without You.
      </div>
    </div>
  );

  const composerBox = (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm focus-within:border-primary">
      <Textarea
        ref={composer}
        rows={started ? 2 : 4}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void send(input);
          }
        }}
        placeholder="Describe The Leads You Want. E.g. Roofing Companies In Hillsborough County With Mobile Numbers."
        className="resize-none border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:flex">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="h-3 w-3" /> Enter To Send · Shift + Enter For A New Line
          </span>
          <span className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] uppercase">Beta</Badge>
            AI May Make Mistakes. You Review Everything Before Anything Runs.
          </span>
        </div>
        <Button className="rounded-full px-5" disabled={busy || !input.trim()} onClick={() => send(input)}>
          <Sparkles className="mr-1 h-4 w-4" /> {started ? "Send" : "Generate Job"}
        </Button>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="AI Lead Assistant"
        description="Describe The Leads You Want. The Assistant Interprets It, Assembles The Job, And Hands You The Controls To Review."
        descriptionClassName="whitespace-nowrap !max-w-none"
        actions={
          started ? (
            <Button variant="outline" className="rounded-full" onClick={startOver}>
              <RotateCcw className="mr-1.5 h-4 w-4" /> Start Over
            </Button>
          ) : undefined
        }
      />

      {!started ? (
        /* Phase one: the AI is the star — no machinery on screen yet. */
        <div className="mx-auto max-w-3xl pt-6">
          {composerBox}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Try:</span>
            {TRY_CHIPS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setInput(c);
                  composer.current?.focus();
                }}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_400px]">
          <div className="space-y-4">
            {composerBox}

            <AssistantTrace steps={traceSteps} revealed={revealed} thinking={busy} />

            {/* The conversation sits under the prompt, so the trace stays the headline. */}
            <Card>
              <CardContent className="pt-6">
                <div ref={scroller} className="max-h-[40vh] space-y-4 overflow-y-auto pr-1">
                  {messages.map((m, i) => (
                    <div key={i}>
                      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {m.role === "user" ? "You" : "LeadTrace"}
                      </div>
                      <div
                        className={`mt-1.5 whitespace-pre-wrap text-sm ${
                          m.role === "user"
                            ? "inline-block rounded-2xl bg-primary px-4 py-2 text-primary-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {busy && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" /> Thinking…
                    </div>
                  )}
                </div>

                {templateChips.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {templateChips.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => send(t.prompt)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary"
                      >
                        {t.title}
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="lg:hidden">
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
                  <span className="text-foreground">{describeSpec(spec)}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">{specPanel}</CollapsibleContent>
              </Collapsible>
            </div>
          </div>

          {/* Phase two: controls slide in only after the AI has something to review. */}
          <div className="spec-slide-in hidden lg:block">{specPanel}</div>
        </div>
      )}
    </div>
  );
}
