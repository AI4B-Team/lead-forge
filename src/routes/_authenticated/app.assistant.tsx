import { z } from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { JobSpecCard } from "@/components/app/job-spec-card";
import { AssistantTrace, buildTraceSteps, openSlots } from "@/components/app/assistant-trace";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Sparkles, ChevronDown, Play, CornerDownLeft, CheckCircle2, RotateCcw, SlidersHorizontal,
  Paperclip, Mic, Send,
} from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { supabase } from "@/integrations/supabase/client";
import { queueJob } from "@/lib/job-submit";
import { ColumnMapperDialog } from "@/components/app/column-mapper";
import {
  attachmentReady, attachmentRows, isSpreadsheet, readAttachment, type UploadAttachment,
} from "@/lib/upload-attachment";
import type { ColumnMap } from "@/lib/csv";
import { assistantChat, createJobFromSpec, requestCoverage } from "@/lib/assistant.functions";
import { runJob } from "@/lib/pipeline.functions";
import { EMPTY_SPEC, describeSpec, specStates, type Coverage, type JobSpec } from "@/lib/assistant.shared";
import { PIPELINE_OPTION_LABELS } from "@/lib/pipeline-options";
import { clearDraft, loadDraft, saveDraft, type ThreadItem } from "@/lib/assistant-draft";
import { TEMPLATES, templateSourceType, type Template } from "@/lib/templates";
import { TemplateCard } from "@/components/marketing/template-card";
import { TemplatePickerDialog } from "@/components/app/template-picker-dialog";
import { templateAdapterStatus } from "@/lib/template-schema";
import { useOverflow } from "@/hooks/use-overflow";
import { US_STATES } from "@/lib/us-geo";
import { loadRecentTemplates, touchRecentTemplate, type RecentTemplate } from "@/lib/recent-templates";
import { takeStashedHandoff, clearStashedPrompt } from "@/lib/prompt-handoff";

export const Route = createFileRoute("/_authenticated/app/assistant")({
  validateSearch: z.object({
    prompt: z.string().optional(),
    fill: z.string().optional(),
    template: z.string().optional(),
    /** Pre-set the List Builder source (business | records | upload). */
    source: z.string().optional(),
    niche: z.string().optional(),
  }),
  head: () => ({
    meta: [
      { title: "AI Lead Assistant — LeadTrace" },
      { name: "description", content: "Describe the leads you want in plain English. The LeadTrace assistant assembles a compliant, runnable list you can review before running." },
      { property: "og:title", content: "AI Lead Assistant — LeadTrace" },
      { property: "og:description", content: "Watch the assistant interpret plain English into a structured, editable list of settings. You always click Generate List." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Assistant,
});

/** Default grid order mirrors the homepage template teaser (first 6 non-upload templates). */
const DEFAULT_GRID_IDS = [
  "gmaps", "probate", "contact-details",
  "yelp", "vacancy", "universal-crawl",
  "glocal", "code", "gserp",
];
const GRID_SLOTS = 9;

const FIELD_LABELS: Partial<Record<keyof JobSpec, string>> = {
  sourceType: "Source",
  niches: "Niches",
  recordType: "Record Type",
  state: "State",
  counties: "Counties",
  recencyDays: "Recency",
  // Toggle names come from the shared config so chips match the panel and checklist.
  removeFranchises: PIPELINE_OPTION_LABELS.removeFranchises,
  dedupe: PIPELINE_OPTION_LABELS.dedupe,
  mobileOnly: PIPELINE_OPTION_LABELS.mobileOnly,
  skipTrace: PIPELINE_OPTION_LABELS.skipTrace,
  industry: "Industry Preset",
  messageAngle: "First-Touch Angle",
};

/** Plain-language list of what a manual panel edit changed, for the thread chip. */
function diffSpec(prev: JobSpec, next: JobSpec): string[] {
  return (Object.keys(FIELD_LABELS) as Array<keyof JobSpec>)
    .filter((k) => JSON.stringify(prev[k]) !== JSON.stringify(next[k]))
    .map((k) => FIELD_LABELS[k]!);
}

const GENERIC_PLACEHOLDER =
  "Describe The Leads You Want. E.g. Roofing Companies In Hillsborough County With Mobile Numbers.";

/**
 * Light slot check used only when a template is selected: the template already
 * knows the source, so all we need from the operator is the "who" and "where".
 */
function missingSlots(text: string, spec: JobSpec) {
  const t = text.toLowerCase();
  const hasGeo =
    specStates(spec).length > 0 ||
    spec.counties.length > 0 ||
    /\b(county|counties|city|zip|statewide)\b/.test(t) ||
    US_STATES.some((s) => new RegExp(`\\b(${s.code.toLowerCase()}|${s.name.toLowerCase()})\\b`).test(t));
  const hasSubject =
    spec.niches.length > 0 || Boolean(spec.recordType) || text.trim().split(/\s+/).length >= 3;
  return { geo: !hasGeo, subject: !hasSubject };
}

function Assistant() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { workspaceId } = useWorkspaceId();
  const chat = useServerFn(assistantChat);
  const createJob = useServerFn(createJobFromSpec);
  const logRequest = useServerFn(requestCoverage);
  const runJobFn = useServerFn(runJob);

  const [thread, setThread] = useState<ThreadItem[]>([]);
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
  const [recents, setRecents] = useState<RecentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [convId, setConvId] = useState<string>(() => `c${Date.now()}`);
  /** Keys the assistant inferred this conversation (drives the % badges). */
  const [inferred, setInferred] = useState<Set<keyof JobSpec>>(new Set());
  const [allOpen, setAllOpen] = useState(false);
  /** Panel-only mode: the List Builder is open with no chat message yet. */
  const [panelOpen, setPanelOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [micSupported, setMicSupported] = useState(false);
  /** Inline upload state — survives a source switch so it can be restored. */
  const [upload, setUpload] = useState<UploadAttachment | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const lastTemplateId = useRef<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const sentPrompt = useRef(false);
  /** Handoff text waiting for its template selection to land before sending. */
  const pendingHandoff = useRef<{ templateId: string; text: string } | null>(null);
  const restored = useRef(false);
  const appliedSource = useRef(false);
  const composer = useRef<HTMLTextAreaElement>(null);
  const specScroll = useOverflow<HTMLDivElement>();

  const started = thread.length > 0 || panelOpen;
  /** True only once a message exists in the thread (panel-only mode has none). */
  const hasChat = thread.length > 0;
  const traceSteps = useMemo(() => buildTraceSteps(spec), [spec]);
  const uploadReady = attachmentReady(upload);
  const missing = useMemo(() => openSlots(spec, uploadReady, selectedTemplate), [spec, uploadReady, selectedTemplate]);
  /** Honest availability: a non-live adapter can never reach the pipeline. */
  const adapterStatus = selectedTemplate ? templateAdapterStatus(selectedTemplate) : "live";
  const adapterLive = adapterStatus === "live";
  const traceComplete =
    revealed >= traceSteps.length && !busy && traceSteps.length > 0 && missing.length === 0;
  const lastAssistantIndex = useMemo(() => {
    for (let i = thread.length - 1; i >= 0; i -= 1) if (thread[i].role === "assistant") return i;
    return -1;
  }, [thread]);

  useEffect(() => {
    composer.current?.focus();
  }, [started]);

  useEffect(() => {
    setMicSupported(
      typeof window !== "undefined" &&
        Boolean((window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition),
    );
  }, []);

  useEffect(() => {
    if (!workspaceId) return;
    setRecents(loadRecentTemplates(workspaceId));
  }, [workspaceId]);

  /**
   * Template selection sets context, never composer text. Picking a template
   * marks it selected, swaps the placeholder to a fill-in example, and presets
   * only the spec fields the template already determines (the source).
   */
  const selectTemplate = (t: Template) => {
    setAllOpen(false);
    if (selectedTemplate?.id === t.id) {
      setSelectedTemplate(null);
      lastTemplateId.current = null;
      if (!hasChat) {
        setSpec(EMPTY_SPEC);
        setInferred(new Set());
      }
      requestAnimationFrame(() => composer.current?.focus());
      return;
    }
    setSelectedTemplate(t);
    lastTemplateId.current = t.id;
    if (hasChat) {
      // Mid-conversation: the template only informs the source, never wipes context.
      setSpec((s) => ({ ...s, sourceType: templateSourceType(t), templateId: t.id }));
      setInferred((prev) => {
        const next = new Set(prev);
        next.delete("sourceType");
        return next;
      });
    } else {
      // Fresh context: reset everything, then apply only what the template determines.
      if (workspaceId) clearDraft(workspaceId);
      setConvId(`c${Date.now()}`);
      setThread([]);
      setFirstPrompt("");
      setCoverage([]);
      setEstimate(null);
      setSuggested([]);
      setConfirmed(false);
      setRevealed(0);
      setInferred(new Set());
      setSpec({ ...EMPTY_SPEC, sourceType: templateSourceType(t), templateId: t.id });
      setUpload(null);
    }
    if (workspaceId) setRecents(touchRecentTemplate(workspaceId, t.id));
    requestAnimationFrame(() => composer.current?.focus());
  };

  /**
   * A file added from either entry point (panel dropzone or composer attach)
   * flips the source to Upload My List and runs the shared mapping step.
   */
  const attachFile = async (file: File) => {
    if (!isSpreadsheet(file)) {
      toast.error("Attach A .csv Or .xlsx File.");
      return;
    }
    try {
      const next = await readAttachment(file);
      setUpload(next);
      if (spec.sourceType !== "upload") {
        setSpec((s) => ({ ...s, sourceType: "upload" }));
        setInferred((prev) => { const out = new Set(prev); out.delete("sourceType"); return out; });
      }
      if (selectedTemplate && templateSourceType(selectedTemplate) !== "upload") {
        setSelectedTemplate(null);
        lastTemplateId.current = null;
        toast.info(`${selectedTemplate.title} Deselected — Using Your Uploaded File Instead.`);
      }
      setConfirmed(false);
      if (hasChat) {
        setThread((m) => [...m, { role: "system", content: `You Attached: ${next.name}` }]);
      } else {
        // Attaching from the hero opens the working view so the panel is visible.
        setThread([
          { role: "system", content: `You Attached: ${next.name}` },
          {
            role: "assistant",
            content: next.parseable && next.mapped
              ? `Got ${next.name} — ${next.rowCount.toLocaleString()} rows. Review the mapping and settings in the List Builder, then generate the list.`
              : `Got ${next.name}. Map your columns in the List Builder and I'll clean, verify, and scrub it.`,
            spec: { ...spec, sourceType: "upload" },
          },
        ]);
      }
      if (next.parseable && !next.mapped) setMapOpen(true);
      else if (next.parseable) {
        toast.success(`${next.name} · ${next.rowCount.toLocaleString()} Rows Detected`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Read That File");
    }
  };

  const saveMapping = (map: ColumnMap) => {
    setUpload((u) => (u ? { ...u, map, mapped: true } : u));
    setMapOpen(false);
    setConfirmed(false);
  };

  const dictate = () => {
    const w = window as unknown as Record<string, any>;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: any) => {
      const said = e.results?.[0]?.[0]?.transcript ?? "";
      if (said) setInput((v) => (v ? `${v} ${said}` : said));
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    setListening(true);
    rec.start();
  };

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [thread, busy, revealed]);

  // Reveal the reasoning trail one row at a time so assembly feels live.
  useEffect(() => {
    if (busy || traceSteps.length === 0) return;
    if (revealed >= traceSteps.length) return;
    const t = setTimeout(() => setRevealed((r) => r + 1), 260);
    return () => clearTimeout(t);
  }, [busy, revealed, traceSteps.length]);

  // Draft persistence (§22): restore on return, keep saving as the thread grows.
  useEffect(() => {
    if (!workspaceId || restored.current) return;
    restored.current = true;
    if (search.prompt?.trim() || search.source) return;
    const draft = loadDraft(workspaceId);
    if (!draft) return;
    if (!draft.thread.length) return;
    setThread(draft.thread);
    setSpec(draft.spec);
    setFirstPrompt(draft.firstPrompt);
    if (draft.convId) setConvId(draft.convId);
    if (draft.templateId) {
      const t = TEMPLATES.find((x) => x.id === draft.templateId);
      if (t) { setSelectedTemplate(t); lastTemplateId.current = t.id; }
    }
    setInferred(new Set((draft.inferred ?? []) as Array<keyof JobSpec>));
    setRevealed(buildTraceSteps(draft.spec).length);
  }, [workspaceId, search.prompt, search.source]);

  useEffect(() => {
    if (!workspaceId || !thread.length) return;
    saveDraft(workspaceId, {
      thread,
      spec,
      firstPrompt,
      convId,
      templateId: selectedTemplate?.id ?? null,
      inferred: Array.from(inferred),
    });
  }, [workspaceId, thread, spec, firstPrompt, convId, selectedTemplate, inferred]);

  const send = async (text: string) => {
    const body = text.trim();
    if (!workspaceId || busy) return;
    // Uploads have their own required slot: a mapped file. Niche/location
    // questions don't apply, so the assistant asks for the file instead.
    if (spec.sourceType === "upload" && !uploadReady) {
      if (body) setThread((m) => [...m, { role: "user", content: body }]);
      setThread((m) => [
        ...m,
        {
          role: "assistant",
          content: upload
            ? "Map your columns in the List Builder on the right and I'll take it from there."
            : "Drop your file in the List Builder on the right, or attach it below.",
          spec,
        },
      ]);
      if (body && !firstPrompt) setFirstPrompt(body);
      setInput("");
      setRevealed(0);
      return;
    }
    if (spec.sourceType === "upload" && !body) return;
    // Template selected but slots still missing: the assistant opens the
    // conversation itself and asks only for what it doesn't have.
    if (selectedTemplate && templateSourceType(selectedTemplate) !== "upload") {
      const miss = missingSlots(body, spec);
      if (!body || miss.geo || miss.subject) {
        const ask = miss.subject && miss.geo
          ? selectedTemplate.category === "records"
            ? "which record type should I pull, and in which county or state?"
            : "what should I look for, and where?"
          : miss.subject
            ? selectedTemplate.category === "records"
              ? "which record type should I pull?"
              : "what should I look for?"
            : "which county or state should I cover?";
        if (body) setThread((m) => [...m, { role: "user", content: body }]);
        setThread((m) => [
          ...m,
          { role: "assistant", content: `You picked ${selectedTemplate.title} — ${ask}`, spec },
        ]);
        if (body && !firstPrompt) setFirstPrompt(body);
        setInput("");
        setRevealed(0);
        return;
      }
    }
    if (!body) return;
    const history = thread
      .filter((m): m is ThreadItem & { role: "user" | "assistant" } => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));
    if (selectedTemplate) {
      history.push({
        role: "user",
        content: `Use the ${selectedTemplate.title} source template (${selectedTemplate.subtitle}).`,
      });
    }
    if (!firstPrompt) setFirstPrompt(body);
    setThread((m) => [...m, { role: "user", content: body }]);
    setInput("");
    setBusy(true);
    setConfirmed(false);
    setRevealed(0);
    try {
      const res = await chat({ data: { workspaceId, message: body, history: history.slice(-12), spec } });
      setThread((m) => [...m, { role: "assistant", content: res.reply, spec: res.spec }]);
      // Anything the model changed this turn counts as inferred, except fields the
      // template already determined (those are certain and need no badge).
      setInferred((prev) => {
        const next = new Set(prev);
        (["sourceType", "recordType", "niches", "state", "counties"] as Array<keyof JobSpec>).forEach((k) => {
          const changed = JSON.stringify(spec[k]) !== JSON.stringify(res.spec[k]);
          const filled = Array.isArray(res.spec[k]) ? (res.spec[k] as unknown[]).length > 0 : Boolean(res.spec[k]);
          if (changed && filled) next.add(k);
        });
        if (selectedTemplate) next.delete("sourceType");
        return next;
      });
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
    if (workspaceId) clearDraft(workspaceId);
    lastTemplateId.current = null;
    setSelectedTemplate(null);
    setThread([]);
    setInput("");
    setSpec(EMPTY_SPEC);
    setFirstPrompt("");
    setCoverage([]);
    setEstimate(null);
    setSuggested([]);
    setConfirmed(false);
    setRevealed(0);
    setInferred(new Set());
    setUpload(null);
    setConvId(`c${Date.now()}`);
    setPanelOpen(false);
  };

  /**
   * Panel-only entry (?source=, and the "set it up yourself" affordance): reset,
   * then apply just the source — the same reset-then-apply as a template pick.
   */
  const openPanelWithSource = (source: "business" | "records" | "upload", niche?: string) => {
    if (workspaceId) clearDraft(workspaceId);
    setConvId(`c${Date.now()}`);
    setThread([]);
    setSelectedTemplate(null);
    lastTemplateId.current = null;
    setFirstPrompt("");
    setCoverage([]);
    setEstimate(null);
    setSuggested([]);
    setConfirmed(false);
    setRevealed(0);
    setInferred(new Set());
    setUpload(null);
    setSpec({ ...EMPTY_SPEC, sourceType: source, niches: niche ? [niche] : [] });
    setPanelOpen(true);
  };

  // Two-way sync: a manual panel edit is announced in the thread so the next
  // assistant turn (and the operator) both know it happened.
  const editSpec = (next: JobSpec) => {
    const changed = diffSpec(spec, next);
    setSpec(next);
    setConfirmed(false);
    if (changed.length) {
      // A hand-edited value is the operator's choice, not an inference.
      setInferred((prev) => {
        const out = new Set(prev);
        (Object.keys(FIELD_LABELS) as Array<keyof JobSpec>).forEach((k) => {
          if (JSON.stringify(spec[k]) !== JSON.stringify(next[k])) out.delete(k);
        });
        return out;
      });
    }
    if (changed.length && thread.length) {
      const content = `You Edited: ${changed.join(" · ")}`;
      setThread((m) => {
        const last = m[m.length - 1];
        // Same field edited again: update the existing chip in place instead of
        // stacking duplicate consecutive chips.
        if (last && last.role === "system" && last.content.startsWith("You Edited: ")) {
          const prevFields = last.content.slice("You Edited: ".length).split(" · ");
          const merged = Array.from(new Set([...prevFields, ...changed]));
          return [...m.slice(0, -1), { role: "system", content: `You Edited: ${merged.join(" · ")}` }];
        }
        return [...m, { role: "system", content }];
      });
    }
  };

  // Deep-link: the marketing handoff carries the typed text in ?prompt= and the
  // selected template in ?template=, with a short-lived stash as the fallback.
  useEffect(() => {
    if (appliedSource.current || !workspaceId) return;
    const source = search.source;
    if (source !== "business" && source !== "records" && source !== "upload") return;
    appliedSource.current = true;
    sentPrompt.current = true;
    openPanelWithSource(source, search.niche?.trim() || undefined);
    navigate({ to: "/app/assistant", search: {}, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, search.source, search.niche]);

  // Deep-link: the marketing handoff carries the typed text in ?prompt= and the
  // selected template in ?template=, with a short-lived stash as the fallback.
  useEffect(() => {
    if (sentPrompt.current || !workspaceId) return;
    const fromUrl = search.prompt?.trim();
    const urlTemplate = search.template;
    const stashed = fromUrl || urlTemplate ? null : takeStashedHandoff();
    const templateId = urlTemplate ?? stashed?.templateId ?? null;
    const initial = (fromUrl || stashed?.text || "").trim();
    if (!templateId && !initial) return;
    sentPrompt.current = true;
    if (fromUrl || urlTemplate) navigate({ to: "/app/assistant", search: {}, replace: true });

    const picked = templateId ? TEMPLATES.find((t) => t.id === templateId) : undefined;
    if (picked) {
      selectTemplate(picked);
      // fill=1 (in-app template pick) prefills the composer instead of sending.
      if (initial && search.fill) {
        setInput(initial);
        return;
      }
      // Send once inside the template context — even with no typed text, so the
      // assistant opens with its own slot-filling question.
      pendingHandoff.current = { templateId: picked.id, text: initial };
      return;
    }
    if (!initial) return;
    if (search.fill) {
      setInput(initial);
      return;
    }
    void send(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, search.prompt, search.template]);

  // The template's spec reset must land before the handoff text is sent.
  useEffect(() => {
    const pending = pendingHandoff.current;
    if (!pending || !selectedTemplate || selectedTemplate.id !== pending.templateId) return;
    pendingHandoff.current = null;
    void send(pending.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate]);

  const uncovered = coverage.filter((c) => c.coverage === "requested" || c.coverage === "unknown");

  const request = async (county: string) => {
    if (!workspaceId) return;
    try {
      await logRequest({ data: { workspaceId, county, recordType: spec.recordType, type: "county" } });
      toast.success("County Request Logged");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Log Request");
    }
  };

  /** Record types we can't fulfill yet land in the same backlog as county requests. */
  const requestRecordType = async (requested: string) => {
    if (!workspaceId) return;
    try {
      await logRequest({ data: { workspaceId, county: null, recordType: requested, type: "record_type" } });
      toast.success("Logged — We'll Notify You When It's Available.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Log Request");
    }
  };

  /** Waitlist click for a source whose adapter isn't wired yet (roadmap signal). */
  const requestTemplateAdapter = async () => {
    if (!workspaceId || !selectedTemplate) return;
    try {
      await logRequest({
        data: {
          workspaceId,
          county: null,
          recordType: selectedTemplate.title,
          templateId: selectedTemplate.id,
          type: "template_adapter",
        },
      });
      toast.success(`Logged — We'll Email You When ${selectedTemplate.title} Goes Live.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Log Request");
    }
  };

  const reviewAndRun = async () => {
    if (!workspaceId) return;
    if (!adapterLive) {
      void requestTemplateAdapter();
      return;
    }
    if (!confirmed) {
      setConfirmed(true);
      return;
    }
    if (spec.sourceType === "upload") {
      if (!upload) {
        toast.error("Attach A File First.");
        return;
      }
      setRunning(true);
      try {
        // Same params shape the Upload page queues, so the pipeline is identical.
        const { id, duplicate } = await queueJob(supabase, {
          workspaceId,
          sourceType: "upload",
          params: {
            file_name: upload.name,
            file_size: upload.size,
            mapping: upload.map,
            skip_trace: spec.skipTrace,
            rows: attachmentRows(upload),
          },
        });
        clearDraft(workspaceId);
        navigate({ to: "/app/lists/$listId", params: { listId: id } });
        if (duplicate) {
          toast.info("This File Was Already Queued — Opening That Run.");
          return;
        }
        toast.success("List Queued. Running Pipeline…");
        runJobFn({ data: { jobId: id } }).catch((e) =>
          toast.error(e instanceof Error ? e.message : "Pipeline Failed"),
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could Not Queue List");
      } finally {
        setRunning(false);
      }
      return;
    }
    setRunning(true);
    try {
      const transcript = thread
        .filter((m): m is ThreadItem & { role: "user" | "assistant" } => m.role !== "system")
        .map((m) => ({ role: m.role, content: m.content }));
      const { jobId } = await createJob({ data: { workspaceId, spec, transcript: transcript.slice(-40) } });
      clearDraft(workspaceId);
      // A template-originated run counts as usage, so it stays near the front.
      if (lastTemplateId.current) setRecents(touchRecentTemplate(workspaceId, lastTemplateId.current));
      toast.success("List Queued. Running Pipeline…");
      navigate({ to: "/app/lists/$listId", params: { listId: jobId } });
      runJobFn({ data: { jobId } }).catch((e) =>
        toast.error(e instanceof Error ? e.message : "Pipeline Failed"),
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Queue List");
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
        ? "Generate List"
        : "Looks Good";

  const geoResolved = Boolean(specStates(spec).length || spec.counties.length || spec.sourceType === "upload");

  const runFooter = (
    <div className="space-y-3 border-t border-border bg-background pt-4">
      {uncovered.length > 0 && (
        <div className="rounded-xl border border-border p-3 text-xs">
          <div className="font-medium text-foreground">Not Covered Yet</div>
          <div className="mt-1 text-muted-foreground">
            Log A Request And We'll Add It To The Backlog.
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {uncovered.map((c) => (
              <Button key={c.county} size="sm" variant="outline" className="rounded-full" onClick={() => request(c.county)}>
                Request {c.county}
              </Button>
            ))}
          </div>
        </div>
      )}

      {estimate && adapterLive && spec.sourceType && geoResolved && (
        <div className="text-center text-xs text-muted-foreground">
          ≈ {estimate.rows.toLocaleString()} Rows · ~{estimate.scrapeCredits.toLocaleString()} Lead Credits
          {estimate.skipTraceCredits ? ` · ~${estimate.skipTraceCredits.toLocaleString()} Skip-Trace Credits` : ""}
        </div>
      )}

      {adapterLive ? (
        <>
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
        </>
      ) : (
        <>
          <Button className="w-full rounded-full" variant="outline" onClick={() => void requestTemplateAdapter()}>
            <Sparkles className="mr-1 h-4 w-4" /> This Source Is Coming — Request Early Access
          </Button>
          <div className="text-center text-[11px] text-muted-foreground">
            {selectedTemplate?.title} Is In Beta. We'll Email You The Day Its Adapter Goes Live.
          </div>
        </>
      )}
    </div>
  );

  const specPanel = (
    <div className="flex min-h-0 flex-col gap-4 lg:h-full">
      <div className="relative min-h-0 lg:flex-1">
        <div
          ref={specScroll.ref}
          className={`h-full min-h-0 lg:overflow-y-auto ${specScroll.overflowing ? "thin-scroll lg:pr-1" : ""}`}
        >
          <JobSpecCard
            spec={spec}
            onChange={editSpec}
            coverage={coverage}
            inferred={inferred}
            upload={upload}
            template={selectedTemplate}
            onChangeTemplate={() => setAllOpen(true)}
            onPickFile={(f) => void attachFile(f)}
            onRemoveUpload={() => { setUpload(null); setConfirmed(false); }}
            onEditMapping={() => setMapOpen(true)}
            onRequestRecordType={requestRecordType}
          />
        </div>
        {specScroll.overflowing && !specScroll.atBottom && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>
      {runFooter}
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
        placeholder={selectedTemplate?.placeholderHint ?? GENERIC_PLACEHOLDER}
        className="resize-none rounded-none border-0 bg-transparent px-2 py-0 text-base shadow-none focus-visible:ring-0"
      />
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap font-medium text-foreground hover:text-primary">
            <Paperclip className="h-3.5 w-3.5" /> Attach File
            <input
              type="file"
              className="hidden"
              accept=".csv,.xlsx"
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void attachFile(f); }}
            />
          </label>
        </div>
        <div className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground lg:flex">
          <span className="flex items-center gap-1.5">
            <CornerDownLeft className="h-3 w-3" /> Enter To Send · Shift + Enter For A New Line
          </span>
          <span className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[10px] uppercase">Beta</Badge>
            AI May Make Mistakes. You Review Everything Before Anything Runs.
          </span>
        </div>
        <Button
          className="rounded-full px-5"
          disabled={busy || (!input.trim() && !selectedTemplate && !upload)}
          onClick={() => send(input)}
        >
          <Sparkles className="mr-1 h-4 w-4" /> {started ? "Send" : "Generate List"}
        </Button>
      </div>
    </div>
  );

  // Recents first (most recent first), padded with the default order.
  const gridTemplates = useMemo(() => {
    const byId = new Map(TEMPLATES.map((t) => [t.id, t] as const));
    const ordered: Template[] = [];
    const seen = new Set<string>();
    for (const r of recents) {
      const t = byId.get(r.id);
      if (t && !seen.has(t.id)) { ordered.push(t); seen.add(t.id); }
    }
    for (const id of DEFAULT_GRID_IDS) {
      if (ordered.length >= GRID_SLOTS) break;
      const t = byId.get(id);
      if (t && !seen.has(t.id)) { ordered.push(t); seen.add(t.id); }
    }
    return ordered.slice(0, GRID_SLOTS);
  }, [recents]);

  const heroState = (
    <div className="mx-auto w-full max-w-5xl space-y-8 py-2">
      <div>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-foreground">AI Lead Assistant</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Describe the leads you want — or build it yourself in the List Builder. Nothing runs until you approve.
        </p>
      </div>

      <div className="relative rounded-2xl border border-primary bg-card p-5 shadow-sm">
        {/* Visual placeholder: icon + label always render as a single aligned row */}
        {!input.trim() && (
          <div className="pointer-events-none absolute inset-x-5 top-5 flex items-center gap-2 pl-0.5 text-base text-muted-foreground">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate">
              {selectedTemplate?.placeholderHint ?? "Tell Me Who You Want To Reach"}
            </span>
          </div>
        )}
        <Textarea
          ref={composer}
          rows={6}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          aria-label="Tell Me Who You Want To Reach"
          style={input.trim() ? undefined : { textIndent: "1.375rem" }}
          className="min-h-[150px] resize-none rounded-none border-0 bg-transparent px-2 py-0 text-base shadow-none focus-visible:ring-0"
        />
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1">
            <label className="inline-flex cursor-pointer items-center rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground">
              <Paperclip className="mr-1.5 h-4 w-4" /> Attach Files
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx"
                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void attachFile(f); }}
              />
            </label>
            {/* Panel-only path: no chat needed, straight into the List Builder. */}
            <button
              type="button"
              onClick={() => openPanelWithSource("business")}
              className="inline-flex items-center rounded-full px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Build It Yourself
            </button>
          </div>
          <div className="flex items-center gap-2">
            {micSupported && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={listening ? "Recording" : "Dictate"}
                onClick={dictate}
                className={`rounded-full ${listening ? "border-primary text-primary mic-recording" : ""}`}
              >
                <Mic className="h-4 w-4" />
              </Button>
            )}
            <Button
              className="rounded-full px-5"
              disabled={busy || (!input.trim() && !selectedTemplate)}
              onClick={() => send(input)}
            >
              Build List <Send className="ml-1.5 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-foreground">
            {recents.length ? "Your Recent Templates" : "Popular Templates"}
          </h2>
          <button
            type="button"
            onClick={() => setAllOpen(true)}
            className="text-sm font-medium text-primary hover:underline"
          >
            View All →
          </button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gridTemplates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              variant="insert"
              compact
              selected={selectedTemplate?.id === t.id}
              onSelect={selectTemplate}
            />
          ))}
        </div>
      </div>

    </div>
  );

  return (
    <div className={started ? "assistant-shell flex flex-col" : "flex flex-col"}>
      {started && (
        <div className="shrink-0">
          <PageHeader
            title="AI Lead Assistant"
            description="Describe The Leads You Want — Or Build It Yourself In The List Builder. Nothing Runs Until You Approve."
            descriptionClassName="whitespace-nowrap !max-w-none"
            actions={
              <Button variant="outline" className="rounded-full" onClick={startOver}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Start Over
              </Button>
            }
          />
        </div>
      )}

      {!started && heroState}

      {started && (
      <div className="grid min-h-0 flex-1 items-start gap-6 lg:grid-cols-[1fr_400px]">
        {/* Chat column: thread scrolls, composer stays pinned to the bottom. */}
        <Card className="flex min-h-0 flex-col lg:h-full">
          <CardContent className="flex min-h-0 flex-1 flex-col p-4 md:p-5">
            <div ref={scroller} className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
              {!hasChat && (
                // Panel-only mode: the assembly checklist still leads, with no chat turn.
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    LeadTrace
                  </div>
                  <div className="mt-1.5 text-sm text-foreground">
                    Build it in the List Builder on the right, or type below and I'll fill it in for you.
                  </div>
                  <div className="mt-3">
                    <AssistantTrace steps={traceSteps} revealed={revealed} thinking={busy} open={missing} />
                  </div>
                </div>
              )}
              {thread.map((m, i) => (
                  <div key={i}>
                    {m.role === "system" ? (
                      <div className="flex justify-center">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
                          <SlidersHorizontal className="h-3 w-3" /> {m.content}
                        </span>
                      </div>
                    ) : (
                      <>
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
                        {/* Assembly status lives inline, in chronological order. */}
                        {m.role === "assistant" && (
                          <div className="mt-3">
                            {i === lastAssistantIndex ? (
                              <AssistantTrace steps={traceSteps} revealed={revealed} thinking={busy} open={missing} />
                            ) : (
                              <AssistantTrace
                                steps={buildTraceSteps(m.spec ?? EMPTY_SPEC)}
                                revealed={buildTraceSteps(m.spec ?? EMPTY_SPEC).length}
                                thinking={false}
                                open={openSlots(m.spec ?? EMPTY_SPEC, uploadReady)}
                              />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 animate-pulse text-primary" /> Thinking…
                </div>
              )}
            </div>

            {templateChips.length > 0 && (
              <div className="mt-4 flex shrink-0 flex-wrap gap-2">
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

            <div className="mt-4 shrink-0">{composerBox}</div>

            {started && (
              <div className="mt-4 shrink-0 lg:hidden">
                <Collapsible>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border px-4 py-3 text-sm">
                    <span className="text-foreground">{describeSpec(spec)}</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-4">{specPanel}</CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </CardContent>
        </Card>

        {/* One consolidated List Builder rail, sticky Generate at its bottom. */}
        <div className="spec-slide-in hidden min-h-0 lg:block lg:h-full">{specPanel}</div>
      </div>
      )}

      {upload?.parseable && (
        <ColumnMapperDialog
          open={mapOpen}
          onOpenChange={setMapOpen}
          fileName={upload.name}
          headers={upload.headers}
          value={upload.map}
          onConfirm={saveMapping}
        />
      )}

      {/* One source browser, mounted once: hero grid, panel row, and View All all use it. */}
      <TemplatePickerDialog
        open={allOpen}
        onOpenChange={setAllOpen}
        selectedId={selectedTemplate?.id ?? null}
        onSelect={selectTemplate}
      />
    </div>
  );
}
