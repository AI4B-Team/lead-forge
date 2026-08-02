import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatTile } from "@/components/app/stat-tile";
import { BotTrainer } from "@/components/app/bot-trainer";
import { BrandCreateDialog } from "@/components/app/brand-create-dialog";
import {
  KnowledgeFlow,
  KnowledgeHealth,
  KnowledgeOutcome,
  SampleQuestions,
  TrainableSources,
  bucketKnowledge,
  knowledgeScore,
} from "@/components/app/brand-knowledge";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { listBrands } from "@/lib/brands.functions";
import { listBotKnowledge } from "@/lib/bot-training.functions";
import { Brain, CheckCircle2, FileStack, FileText, Globe, MessageSquareQuote, Plus, RefreshCw, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/brands")({
  head: () => ({
    meta: [
      { title: "AI Brands — LeadTrace" },
      { name: "description", content: "Teach the LeadTrace AI your company — website, documents, scripts, transcripts and FAQs — so every reply comes from approved knowledge." },
      { property: "og:title", content: "AI Brands — LeadTrace" },
      { property: "og:description", content: "Give the AI everything about your business and it communicates like your best salesperson." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Brands,
});

function formatWhen(iso?: string) {
  if (!iso) return "Never";
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 2) return "Just Now";
  if (mins < 60) return `${mins} Minutes Ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} Hour${hours === 1 ? "" : "s"} Ago`;
  const days = Math.round(hours / 24);
  return `${days} Day${days === 1 ? "" : "s"} Ago`;
}

function Brands() {
  const { workspaceId } = useWorkspaceId();
  const qc = useQueryClient();
  const fetchBrands = useServerFn(listBrands);
  const fetchKnowledge = useServerFn(listBotKnowledge);
  const [active, setActive] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["brands", workspaceId],
    queryFn: () => fetchBrands({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const brands = data?.brands ?? [];
  const sourceCounts = data?.sources ?? {};

  useEffect(() => {
    if (!active && brands.length) setActive(brands[0].id);
  }, [brands, active]);

  const current = brands.find((b) => b.id === active);

  const { data: knowledge } = useQuery({
    queryKey: ["bot-knowledge", `brand:${current?.id}`],
    queryFn: () => fetchKnowledge({ data: { brandId: current!.id } }),
    enabled: !!current,
  });
  const sources = knowledge ?? [];
  const buckets = bucketKnowledge(sources);
  const score = knowledgeScore(sources);
  const totalChars = sources.reduce((a, s) => a + s.chars, 0);
  const lastTrained = sources[0]?.created_at;
  const totalSources = Object.values(sourceCounts).reduce((a, n) => a + n, 0);

  return (
    <div>
      <PageHeader
        title="AI Brands"
        description="Train Your AI Once — Then Every Reply Sounds Like Your Best Salesperson."
        descriptionClassName="whitespace-nowrap"
        actions={
          <>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => qc.invalidateQueries({ queryKey: ["brands", workspaceId] })}
            >
              <RefreshCw className="h-4 w-4 mr-1.5" /> Refresh
            </Button>
            {workspaceId && (
              <BrandCreateDialog
                workspaceId={workspaceId}
                onCreated={setActive}
                trigger={
                  <Button className="rounded-full">
                    <Plus className="h-4 w-4 mr-1.5" /> New Brand
                  </Button>
                }
              />
            )}
          </>
        }
      />

      {/* Empty state gets a breathing hero instead of four zeroed-out metrics. */}
      {current && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatTile label="Training Sources" value={totalSources} icon={FileStack} hint="Across All Brands" />
          <StatTile label="Documents Indexed" value={sources.length} icon={FileText} hint={`In ${current.name}`} />
          <StatTile
            label="Knowledge Volume"
            value={totalChars >= 1000 ? `${Math.round(totalChars / 1000)}k Chars` : `${totalChars} Chars`}
            icon={Brain}
            hint="Active Brand"
          />
          <StatTile
            label="Accuracy Score"
            value={`${score}%`}
            icon={Sparkles}
            hint={score >= 80 ? "Your AI Is Ready" : "Keep Training"}
          />
        </div>
      )}

      {/* Brand cards replace the old dropdown — pick or add in one glance. */}
      {workspaceId && brands.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {brands.map((b) => (
            <button key={b.id} type="button" onClick={() => setActive(b.id)} className="text-left">
              <Card className={`h-full transition ${b.id === active ? "border-primary shadow-sm" : "hover:border-primary/50"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Brain className="h-4 w-4" />
                      </span>
                      <div className="font-display font-bold text-foreground">{b.name}</div>
                    </div>
                    <Badge variant={b.id === active ? "default" : "outline"} className="text-[10px] uppercase shrink-0">
                      {b.id === active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  {b.website && (
                    <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <Globe className="h-3.5 w-3.5 shrink-0" /> {b.website}
                    </div>
                  )}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {sourceCounts[b.id] ?? 0} Knowledge Source{(sourceCounts[b.id] ?? 0) === 1 ? "" : "s"}
                  </div>
                </CardContent>
              </Card>
            </button>
          ))}
          <BrandCreateDialog
            workspaceId={workspaceId}
            onCreated={setActive}
            trigger={
              <button type="button" className="text-left">
                <Card className="h-full border-dashed transition hover:border-primary/60">
                  <CardContent className="pt-6 flex h-full flex-col items-center justify-center text-center">
                    <Plus className="h-5 w-5 text-primary" />
                    <div className="mt-2 font-display font-bold text-foreground">New Brand</div>
                    <div className="text-xs text-muted-foreground mt-1">Teach The AI Another Company</div>
                  </CardContent>
                </Card>
              </button>
            }
          />
        </div>
      )}

      {current ? (
        <>
          {/* Knowledge control center for the active brand. */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="font-display text-xl font-bold text-foreground">{current.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Last Trained {formatWhen(lastTrained)} · {sources.length} Source{sources.length === 1 ? "" : "s"}
                  </div>
                </div>
                <div className="lg:w-[420px]">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <span>Brand Knowledge</span>
                    <span className="tabular-nums text-foreground">{score}%</span>
                  </div>
                  <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${score}%` }} />
                  </div>
                  <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    {score >= 80 ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Your AI Is Ready To Reply
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
            </CardContent>
          </Card>

          <BotTrainer key={current.id} brandId={current.id} heading={`Train The AI On ${current.name}`} />
        </>
      ) : (
        <>
          <Card className="mb-8">
            <CardContent className="py-12 text-center">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Brain className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-3xl font-black text-foreground">Create Your First AI Brand</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
                Upload Your Website And Documents In Under 2 Minutes. Your AI Will Immediately Begin Answering From Your
                Business Knowledge — No Hallucinations, No Made-Up Promises.
              </p>
              {workspaceId && (
                <div className="mt-6 flex justify-center">
                  <BrandCreateDialog
                    workspaceId={workspaceId}
                    onCreated={setActive}
                    trigger={
                      <Button size="lg" className="rounded-full">
                        <Plus className="h-4 w-4 mr-1.5" /> Create Brand
                      </Button>
                    }
                  />
                </div>
              )}

              {/* Sample questions make the payoff concrete before any upload. */}
              <div className="mt-8 border-t border-border pt-6 text-left">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <MessageSquareQuote className="h-3.5 w-3.5" /> Try Asking Your AI
                </div>
                <div className="mt-3">
                  <SampleQuestions />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mb-4">
            <h3 className="font-display text-xl font-bold text-foreground">What Can I Train?</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Feed The AI Any Of These — It Only Ever Speaks From What You Approve.
            </p>
          </div>
          <TrainableSources />

          <div className="mt-8 mb-4">
            <h3 className="font-display text-xl font-bold text-foreground">How It Works</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your Uploads Become Capabilities — Here's What The AI Walks Away Knowing.
            </p>
          </div>
          <Card>
            <CardContent className="pt-6">
              <KnowledgeOutcome />
              <div className="mt-6 border-t border-border pt-5">
                <KnowledgeFlow />
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
