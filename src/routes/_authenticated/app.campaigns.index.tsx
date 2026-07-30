import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, ShieldAlert, LayoutGrid, List, Bot } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { getRegistration } from "@/lib/numbers.functions";
import { listCampaigns } from "@/lib/campaigns.functions";

type ViewMode = "cards" | "list";

export const Route = createFileRoute("/_authenticated/app/campaigns/")({
  head: () => ({ meta: [{ title: "Campaigns — LeadTrace" }] }),
  component: Campaigns,
});

function Campaigns() {
  const { workspaceId } = useWorkspaceId();
  const [view, setView] = useState<ViewMode>("list");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? (localStorage.getItem("campaigns-view") as ViewMode | null) : null;
    if (saved === "cards" || saved === "list") setView(saved);
  }, []);

  const handleSetView = (v: ViewMode) => {
    if (!v) return;
    setView(v);
    localStorage.setItem("campaigns-view", v);
  };

  const fetchReg = useServerFn(getRegistration);
  const { data: regData } = useQuery({
    queryKey: ["registration", workspaceId],
    queryFn: () => fetchReg({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const fetchCampaigns = useServerFn(listCampaigns);
  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns", workspaceId],
    queryFn: () => fetchCampaigns({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const campaignApproved = regData?.registration?.campaign_status === "approved";
  const campaigns = campaignsData?.campaigns ?? [];
  const stats = campaignsData?.stats ?? {};
  const tags = campaignsData?.tags ?? {};
  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Only Clean Files Can Be Loaded. Reply-Stops-Drip Is Automatic."
        actions={
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={view} onValueChange={(v) => handleSetView(v as ViewMode)} className="border rounded-full p-1 bg-background">
              <ToggleGroupItem value="cards" aria-label="Card view" className="rounded-full px-3 py-1.5 h-auto data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <LayoutGrid className="h-4 w-4 mr-1.5" /> Cards
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view" className="rounded-full px-3 py-1.5 h-auto data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                <List className="h-4 w-4 mr-1.5" /> List
              </ToggleGroupItem>
            </ToggleGroup>
            <Button asChild className="rounded-full">
              <Link to="/app/campaigns/new"><Plus className="mr-1 h-4 w-4" /> New Campaign</Link>
            </Button>
          </div>
        }
      />
      {!campaignApproved && (
        <div className="mb-6 rounded-2xl border border-warn/30 bg-warn/5 p-4 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-warn shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-display font-bold text-foreground">Sending Blocked — 10DLC Registration Incomplete</div>
            <div className="text-sm text-muted-foreground">Complete A2P Brand + Campaign Registration Before Any SMS Can Be Sent. This Is A Hard Gate.</div>
          </div>
          <Button asChild size="sm" className="rounded-full">
            <Link to="/app/registration">Complete Registration</Link>
          </Button>
        </div>
      )}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <div className="font-display font-bold text-lg text-foreground">No Campaigns Yet</div>
            <div className="text-sm text-muted-foreground mt-1">Launch A Campaign From A Ready List Or Start One From Scratch.</div>
            <Button asChild className="rounded-full mt-4">
              <Link to="/app/campaigns/new"><Plus className="mr-1 h-4 w-4" /> New Campaign</Link>
            </Button>
          </CardContent>
        </Card>
      ) : view === "cards" ? (
        <div className="grid md:grid-cols-3 gap-4">
          {campaigns.map((c) => (
            <CampaignCard key={c.id} campaign={c} stats={stats[c.id]} tag={c.tag_id ? tags[c.tag_id] : undefined} />
          ))}
        </div>
      ) : (
        <CampaignList campaigns={campaigns} stats={stats} tags={tags} />
      )}
    </div>
  );
}

function CampaignCard({ campaign: c, stats: s, tag }: { campaign: any; stats?: any; tag?: any }) {
  const stat = s ?? { sent: 0, replies: 0, optOuts: 0, recipients: 0 };
  return (
    <Link to="/app/campaigns/$campaignId" params={{ campaignId: c.id }}>
      <Card className="hover:border-primary transition">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="uppercase text-[10px]">{c.status ?? "draft"}</Badge>
            <div className="flex items-center gap-2">
              {tag && (
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                  style={{
                    backgroundColor: `${tag.color}1a`,
                    color: tag.color,
                    borderColor: `${tag.color}55`,
                  }}
                >
                  {tag.name}
                </span>
              )}
              <div className="text-xs text-muted-foreground">Cap {c.daily_cap ?? 500}/Day</div>
            </div>
          </div>
          <div className="mt-3 font-display font-bold text-lg text-foreground">{c.name}</div>
          {c.bot_enabled && (
            <div className="mt-1 text-[11px] font-semibold text-primary flex items-center gap-1">
              <Bot className="h-3 w-3" /> AI Warm-Up Bot On
            </div>
          )}
          <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
            <MiniStat label="Sent" value={stat.sent} />
            <MiniStat label="Replies" value={stat.replies} />
            <MiniStat label="Opt-Outs" value={stat.optOuts} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function CampaignList({ campaigns, stats, tags }: { campaigns: any[]; stats: Record<string, any>; tags: Record<string, any> }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted border-b border-border">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-3 font-semibold">Campaign</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Tag</th>
                <th className="px-4 py-3 font-semibold text-right">Recipients</th>
                <th className="px-4 py-3 font-semibold text-right">Sent</th>
                <th className="px-4 py-3 font-semibold text-right">Replies</th>
                <th className="px-4 py-3 font-semibold text-right">Opt-Outs</th>
                <th className="px-4 py-3 font-semibold text-right">Cap</th>
                <th className="px-4 py-3 font-semibold text-center">Bot</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => {
                const s = stats[c.id] ?? { sent: 0, replies: 0, optOuts: 0, recipients: 0 };
                const tag = c.tag_id ? tags[c.tag_id] : undefined;
                return (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50 transition">
                    <td className="px-4 py-3">
                      <Link to="/app/campaigns/$campaignId" params={{ campaignId: c.id }} className="font-display font-bold text-foreground hover:text-primary">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="uppercase text-[10px]">{c.status ?? "draft"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      {tag ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold border"
                          style={{
                            backgroundColor: `${tag.color}1a`,
                            color: tag.color,
                            borderColor: `${tag.color}55`,
                          }}
                        >
                          {tag.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{(s.recipients ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{(s.sent ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{(s.replies ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{(s.optOuts ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{c.daily_cap ?? 500}/Day</td>
                    <td className="px-4 py-3 text-center">
                      {c.bot_enabled ? <Bot className="h-4 w-4 text-primary mx-auto" /> : <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="font-display font-bold text-lg text-foreground">{value.toLocaleString()}</div>
    </div>
  );
}
