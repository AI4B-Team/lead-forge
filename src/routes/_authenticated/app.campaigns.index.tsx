import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ShieldAlert } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { getRegistration } from "@/lib/numbers.functions";
import { listCampaigns } from "@/lib/campaigns.functions";

export const Route = createFileRoute("/_authenticated/app/campaigns/")({
  head: () => ({ meta: [{ title: "Campaigns — LeadTrace" }] }),
  component: Campaigns,
});

function Campaigns() {
  const { workspaceId } = useWorkspaceId();
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
  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Only Clean Files Can Be Loaded. Reply-Stops-Drip Is Automatic."
        actions={
          <Button asChild className="rounded-full">
            <Link to="/app/campaigns/new"><Plus className="mr-1 h-4 w-4" /> New Campaign</Link>
          </Button>
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
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          {campaigns.map((c) => {
            const s = stats[c.id] ?? { sent: 0, replies: 0, optOuts: 0, recipients: 0 };
            return (
              <Link key={c.id} to="/app/campaigns/$campaignId" params={{ campaignId: c.id }}>
                <Card className="hover:border-primary transition">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="uppercase text-[10px]">{c.status ?? "draft"}</Badge>
                      <div className="text-xs text-muted-foreground">Cap {c.daily_cap ?? 500}/Day</div>
                    </div>
                    <div className="mt-3 font-display font-bold text-lg text-foreground">{c.name}</div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                      <MiniStat label="Sent" value={s.sent} />
                      <MiniStat label="Replies" value={s.replies} />
                      <MiniStat label="Opt-Outs" value={s.optOuts} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
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