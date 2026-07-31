import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { JobSpecCard } from "@/components/app/job-spec-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import { Sparkles, Send, ChevronDown, Play } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { assistantChat, createJobFromSpec, requestCoverage } from "@/lib/assistant.functions";
import { runJob } from "@/lib/pipeline.functions";
import { EMPTY_SPEC, describeSpec, type AssistantMessage, type Coverage, type JobSpec } from "@/lib/assistant.shared";
import { TEMPLATES } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/app/assistant")({
  head: () => ({
    meta: [
      { title: "AI Lead Assistant — LeadTrace" },
      { name: "description", content: "Describe the leads you want in plain English. The LeadTrace assistant assembles a compliant, runnable pipeline job you can edit before running." },
      { property: "og:title", content: "AI Lead Assistant — LeadTrace" },
      { property: "og:description", content: "Conversation on the left, a live editable job spec on the right. You always click Run." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Assistant,
});

const GREETING = "What Leads Do You Want To Reach Today? Tell Me The Trade Or Record Type And The Area, And I'll Assemble The Job.";

function Assistant() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspaceId();
  const chat = useServerFn(assistantChat);
  const createJob = useServerFn(createJobFromSpec);
  const logRequest = useServerFn(requestCoverage);
  const runJobFn = useServerFn(runJob);

  const [messages, setMessages] = useState<AssistantMessage[]>([{ role: "assistant", content: GREETING }]);
  const [input, setInput] = useState("");
  const [spec, setSpec] = useState<JobSpec>(EMPTY_SPEC);
  const [coverage, setCoverage] = useState<Array<{ county: string; coverage: Coverage }>>([]);
  const [estimate, setEstimate] = useState<{ rows: number; skipTraceCredits: number; scrapeCredits: number } | null>(null);
  const [suggested, setSuggested] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [running, setRunning] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const sentPrompt = useRef(false);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const body = text.trim();
    if (!body || !workspaceId || busy) return;
    const history = messages;
    setMessages((m) => [...m, { role: "user", content: body }]);
    setInput("");
    setBusy(true);
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

  // Deep-link: the homepage prompt box carries its text straight into the chat.
  useEffect(() => {
    if (sentPrompt.current || !workspaceId) return;
    try {
      const stashed = sessionStorage.getItem("leadtrace_prompt");
      if (!stashed) return;
      sessionStorage.removeItem("leadtrace_prompt");
      sentPrompt.current = true;
      void send(stashed);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

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

  const specPanel = (
    <div className="space-y-4">
      <JobSpecCard spec={spec} onChange={setSpec} coverage={coverage} estimate={estimate} />
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
        disabled={running || !spec.sourceType}
        onClick={reviewAndRun}
      >
        <Play className="h-4 w-4 mr-1" /> {running ? "Queueing…" : "Review & Run"}
      </Button>
      <div className="text-[11px] text-muted-foreground text-center">
        The Assistant Assembles. You Run. Nothing Sends Without You.
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="AI Lead Assistant"
        description="Describe The Leads You Want. Watch The Job Spec Build Itself On The Right, And Edit Anything Before You Run."
        descriptionClassName="whitespace-nowrap"
      />

      <div className="grid lg:grid-cols-[1fr_380px] gap-6 items-start">
        <Card className="flex flex-col">
          <CardContent className="pt-6 flex flex-col gap-4">
            <div ref={scroller} className="max-h-[52vh] overflow-y-auto space-y-3 pr-1">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
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
              <div className="flex flex-wrap gap-2">
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

            <div className="lg:hidden">
              <Collapsible>
                <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
                  <span className="text-foreground">{describeSpec(spec)}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-4">{specPanel}</CollapsibleContent>
              </Collapsible>
            </div>

            <div className="flex items-end gap-2">
              <Textarea
                rows={2}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send(input);
                  }
                }}
                placeholder="E.g. Probate filings in Hillsborough County from the last 90 days, skip trace the missing numbers"
                className="resize-none"
              />
              <Button className="rounded-full" disabled={busy} onClick={() => send(input)}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="outline" className="text-[10px] uppercase">Beta</Badge>
              AI May Make Mistakes. Verify Important Details Before Running.
            </div>
          </CardContent>
        </Card>

        <div className="hidden lg:block">{specPanel}</div>
      </div>
    </div>
  );
}