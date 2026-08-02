import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SampleQuestions } from "@/components/app/brand-knowledge";
import { KnowledgeSourceList } from "@/components/app/knowledge-cards";
import { AgentComposer, RecentTraining } from "@/components/app/agent-training";
import { agentIntelligence } from "@/lib/agent-intelligence.shared";
import { AgentQuestionTester } from "@/components/app/agent-questions";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { useWorkspaceAgent } from "@/hooks/use-agent";
import { createBrand } from "@/lib/brands.functions";
import { listBotKnowledge } from "@/lib/bot-training.functions";
import { Bot, Check, Circle, Globe, MessageSquareQuote, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/agent")({
  head: () => ({
    meta: [
      { title: "AI Agent — LeadTrace" },
      {
        name: "description",
        content:
          "Teach your LeadTrace AI agent your business — website, documents, scripts, transcripts and FAQs — so every reply comes from approved knowledge.",
      },
      { property: "og:title", content: "AI Agent — LeadTrace" },
      { property: "og:description", content: "Your agent only ever speaks from knowledge you approve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentPage,
});

function formatWhen(iso?: string) {
  if (!iso) return "Never";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 2) return "Just Now";
  if (mins < 60) return `${mins} Minutes Ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} Hour${hours === 1 ? "" : "s"} Ago`;
  const days = Math.round(hours / 24);
  return `${days} Day${days === 1 ? "" : "s"} Ago`;
}

/** The trust hook — the agent never invents anything. */
function NothingInvented() {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 flex items-start gap-2.5">
      <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="text-sm text-muted-foreground">
        <span className="font-display font-bold text-foreground">Nothing Invented.</span> Every Response, Objection,
        FAQ, Offer, And Appointment Comes From Your Approved Company Knowledge.
      </div>
    </div>
  );
}

function AgentSetup({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const create = useServerFn(createBrand);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast.error("Name Your Agent");
    setSaving(true);
    try {
      await create({ data: { workspaceId, name: name.trim(), website, description } });
      await qc.invalidateQueries({ queryKey: ["brands", workspaceId] });
      toast.success("Agent Created", { description: "Now Feed It Your Knowledge Below." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could Not Create Agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bot className="h-4 w-4" />
            </span>
            <div className="font-display text-lg font-bold text-foreground">Your Business</div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <Label>Business Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summit Roofing" />
            </div>
            <div>
              <Label>Website (Optional)</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://summitroofing.com" />
              <div className="text-[11px] text-muted-foreground mt-1">Add Pages As URL Sources After Setup.</div>
            </div>
          </div>
          <div className="mt-4">
            <Label>What You Offer (Optional)</Label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Who you serve, what you sell, how you talk, what you never promise…"
            />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button className="rounded-full" onClick={submit} disabled={saving}>
              {saving ? "Creating…" : "Create My Agent"}
            </Button>
            <span className="text-xs text-muted-foreground">Takes Under 2 Minutes — Training Comes Next.</span>
          </div>

          <div className="mt-6">
            <NothingInvented />
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <MessageSquareQuote className="h-3.5 w-3.5" /> What You'll Be Able To Ask
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Once Your Agent Is Created And Trained, You Can Test It With Questions Like These.
            </p>
            <div className="mt-3">
              <SampleQuestions />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4">
        <h2 className="font-display text-xl font-bold text-foreground">Knowledge Sources</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Feed Your Agent Any Of These — It Only Speaks From What You Approve.
        </p>
      </div>
      <KnowledgeSourceList />
    </>
  );
}

function AgentPage() {
  const { workspaceId } = useWorkspaceId();
  const qc = useQueryClient();
  const { agent, loading } = useWorkspaceAgent(workspaceId);
  const fetchKnowledge = useServerFn(listBotKnowledge);

  const { data: knowledge } = useQuery({
    queryKey: ["bot-knowledge", `brand:${agent?.id}`],
    queryFn: () => fetchKnowledge({ data: { brandId: agent!.id } }),
    enabled: !!agent,
  });
  const sources = knowledge ?? [];
  const iq = agentIntelligence(sources);
  const lastTrained = sources[0]?.created_at;

  const focusComposer = () => {
    const el = document.getElementById("train-your-agent");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => el?.querySelector("textarea")?.focus(), 400);
  };

  return (
    <div>
      <PageHeader
        title={agent ? "AI Agent" : "Set Up Your AI Agent"}
        description={
          agent
            ? "Train It Once — Then Every Reply Sounds Like Your Best Salesperson."
            : "Teach It Everything About Your Business — It Only Ever Speaks From What You Approve."
        }
      />

      {!workspaceId || loading ? (
        <Card>
          <CardContent className="py-16 text-center text-sm text-muted-foreground">Loading Your Agent…</CardContent>
        </Card>
      ) : !agent ? (
        <AgentSetup workspaceId={workspaceId} />
      ) : (
        <>
          {/* 1 — The hero: one number that says how smart the agent is. */}
          <Card className="overflow-hidden border-border/80">
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="font-display text-xl font-bold leading-tight text-foreground">{agent.name}</div>
                    {agent.website && (
                      <div className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        <Globe className="h-3 w-3" /> {agent.website}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button className="rounded-full" onClick={focusComposer}>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Train Agent
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full"
                    aria-label="Refresh"
                    onClick={() => qc.invalidateQueries({ queryKey: ["brands", workspaceId] })}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Agent Intelligence
                  </div>
                  <div className="font-display text-6xl font-black leading-none tabular-nums text-foreground">
                    {iq.score}%
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${iq.tier.chip}`}
                >
                  <span className={`h-2 w-2 rounded-full ${iq.tier.fill}`} /> {iq.tier.label}
                </span>
              </div>

              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${iq.tier.fill}`}
                  style={{ width: `${Math.max(iq.score, 1.5)}%` }}
                />
              </div>

              <div className="mt-2.5 text-sm text-muted-foreground">{iq.tier.blurb}</div>

              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {sources.length} Source{sources.length === 1 ? "" : "s"}
                </span>
                <span>·</span>
                <span>{iq.chars >= 1000 ? `${Math.round(iq.chars / 1000)}k` : iq.chars} Chars Indexed</span>
                <span>·</span>
                <span>Last Trained {formatWhen(lastTrained)}</span>
              </div>

              {/* Knowledge as a checklist — progress, not a spreadsheet. */}
              <div className="mt-5 border-t border-border pt-4">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Knowledge
                  </div>
                  <div className="text-xs font-semibold tabular-nums text-foreground">
                    {iq.complete} / {iq.total} Complete
                  </div>
                </div>
                <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-4">
                  {iq.categories.map((c) => (
                    <a
                      key={c.key}
                      href={`#knowledge-card-${c.key}`}
                      className="flex items-center gap-2 rounded-md py-0.5 text-sm transition hover:text-primary"
                    >
                      {c.count > 0 ? (
                        <Check className="h-3.5 w-3.5 shrink-0 text-success" />
                      ) : (
                        <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      )}
                      <span className={c.count > 0 ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                      {c.count > 0 && (
                        <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                          {c.count} {c.count === 1 ? c.unit : `${c.unit}s`}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-start gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                Your Agent Only Answers From Knowledge You Approve — Nothing Invented.
              </div>
            </CardContent>
          </Card>

          {/* 2 — Teaching is the primary workflow: one box, we do the filing. */}
          <div id="train-your-agent" className="mt-8 scroll-mt-24">
            <h2 className="font-display text-xl font-bold text-foreground">Train Your Agent</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste, Attach, Or Dictate Anything About Your Business — We Sort It Into The Right Place.
            </p>
            <div className="mt-3">
              <AgentComposer key={agent.id} brandId={agent.id} />
            </div>
          </div>

          {/* 3 — Test immediately after training, where people expect it. */}
          <Card className="mt-6">
            <CardContent className="pt-6">
              <AgentQuestionTester brandId={agent.id} sources={sources} />
            </CardContent>
          </Card>

          {/* 4 — Secondary organizational view. */}
          <div className="mt-8">
            <h2 className="font-display text-xl font-bold text-foreground">Knowledge Sources</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Everything Your Agent Knows, By Source — Click Any Row To Add Or Manage It.
            </p>
            <div className="mt-3">
              <KnowledgeSourceList brandId={agent.id} sources={sources} />
            </div>
          </div>

          {/* 5 — Training history as a story. */}
          <div className="mt-8">
            <h2 className="font-display text-xl font-bold text-foreground">Recent Training</h2>
            <p className="mt-1 text-sm text-muted-foreground">Every Lesson Your Agent Has Learned, Newest First.</p>
            <div className="mt-3">
              <RecentTraining brandId={agent.id} sources={sources} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
