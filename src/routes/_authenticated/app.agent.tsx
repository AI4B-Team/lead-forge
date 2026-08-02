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
import { StatTile } from "@/components/app/stat-tile";
import { BotTrainer } from "@/components/app/bot-trainer";
import {
  KnowledgeFlow,
  KnowledgeHealth,
  KnowledgeOutcome,
  SampleQuestions,
  bucketKnowledge,
  knowledgeScore,
} from "@/components/app/brand-knowledge";
import { KnowledgeSourceCards } from "@/components/app/knowledge-cards";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { useWorkspaceAgent } from "@/hooks/use-agent";
import { createBrand } from "@/lib/brands.functions";
import { listBotKnowledge } from "@/lib/bot-training.functions";
import { Bot, Brain, CheckCircle2, FileStack, FileText, Globe, MessageSquareQuote, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";

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

          <div className="mt-6 border-t border-border pt-5">
            <KnowledgeFlow />
          </div>
          <div className="mt-5">
            <NothingInvented />
          </div>

          <div className="mt-6 border-t border-border pt-5">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <MessageSquareQuote className="h-3.5 w-3.5" /> Try Asking Your Agent
            </div>
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
      <KnowledgeSourceCards />

      <div className="mt-8 mb-4">
        <h2 className="font-display text-xl font-bold text-foreground">How It Works</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your Uploads Become Capabilities — Here's What Your Agent Walks Away Knowing.
        </p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <KnowledgeOutcome />
        </CardContent>
      </Card>
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
  const buckets = bucketKnowledge(sources);
  const score = knowledgeScore(sources);
  const totalChars = sources.reduce((a, s) => a + s.chars, 0);
  const lastTrained = sources[0]?.created_at;

  return (
    <div>
      <PageHeader
        title={agent ? "AI Agent" : "Set Up Your AI Agent"}
        description={
          agent
            ? "Train It Once — Then Every Reply Sounds Like Your Best Salesperson."
            : "Teach It Everything About Your Business — It Only Ever Speaks From What You Approve."
        }
        actions={
          agent ? (
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => qc.invalidateQueries({ queryKey: ["brands", workspaceId] })}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
            </Button>
          ) : undefined
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatTile label="Knowledge Sources" value={sources.length} icon={FileStack} hint="Approved Material" />
            <StatTile
              label="Knowledge Volume"
              value={totalChars >= 1000 ? `${Math.round(totalChars / 1000)}k Chars` : `${totalChars} Chars`}
              icon={Brain}
              hint="Indexed For Replies"
            />
            <StatTile label="Documents Indexed" value={buckets.find((b) => b.key === "file")?.count ?? 0} icon={FileText} hint="Files Uploaded" />
            <StatTile
              label="Readiness"
              value={`${score}%`}
              icon={Sparkles}
              hint={score >= 80 ? "Your Agent Is Ready" : "Keep Training"}
            />
          </div>

          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="font-display text-xl font-bold text-foreground">{agent.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Last Trained {formatWhen(lastTrained)} · {sources.length} Source{sources.length === 1 ? "" : "s"}
                      {agent.website ? " · " : ""}
                      {agent.website && (
                        <span className="inline-flex items-center gap-1 align-middle">
                          <Globe className="h-3 w-3" /> {agent.website}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="lg:w-[420px]">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <span>Readiness</span>
                    <span className="tabular-nums text-foreground">{score}%</span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${score}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {score >= 80 ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Your Agent Is Ready To Reply
                      </>
                    ) : (
                      "Add More Material To Raise Reply Quality"
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {buckets.map((b) => (
                  <div key={b.key} className="rounded-xl border border-border bg-surface px-4 py-3">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      <b.icon className="h-3.5 w-3.5" /> {b.label}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5">
                      <span className="font-display text-2xl font-black leading-none tabular-nums text-foreground">{b.count}</span>
                      <span className="text-xs text-muted-foreground">{b.unit}</span>
                      {b.count > 0 && <CheckCircle2 className="h-3.5 w-3.5 text-success ml-auto" />}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <KnowledgeHealth sources={sources} score={score} />
              </div>

              <div className="mt-6 border-t border-border pt-5">
                <KnowledgeFlow />
              </div>

              <div className="mt-5">
                <NothingInvented />
              </div>
            </CardContent>
          </Card>

          <BotTrainer key={agent.id} brandId={agent.id} heading={`Train ${agent.name}`} />

          <div className="mt-8 mb-4">
            <h2 className="font-display text-xl font-bold text-foreground">Knowledge Sources</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Feed Your Agent Any Of These — It Only Speaks From What You Approve.
            </p>
          </div>
          <KnowledgeSourceCards brandId={agent.id} sources={sources} />
        </>
      )}
    </div>
  );
}
