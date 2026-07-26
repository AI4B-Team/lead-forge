import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_CAMPAIGNS } from "@/lib/mock-data";
import { Plus, ShieldAlert } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { getRegistration } from "@/lib/numbers.functions";

export const Route = createFileRoute("/_authenticated/app/campaigns")({
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
  const campaignApproved = regData?.registration?.campaign_status === "approved";
  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Only Clean Files Can Be Loaded. Reply-Stops-Drip Is Automatic."
        actions={
          <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> New Campaign</Button>
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
      <div className="grid md:grid-cols-3 gap-4">
        {MOCK_CAMPAIGNS.map((c) => (
          <Link key={c.id} to="/app/campaigns/$campaignId" params={{ campaignId: c.id }}>
            <Card className="hover:border-primary transition">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="uppercase text-[10px]">{c.status}</Badge>
                  <div className="text-xs text-muted-foreground">Cap {c.dailyCap}/Day</div>
                </div>
                <div className="mt-3 font-display font-bold text-lg text-foreground">{c.name}</div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <MiniStat label="Sent" value={c.sent} />
                  <MiniStat label="Replies" value={c.replies} />
                  <MiniStat label="Opt-Outs" value={c.optOuts} />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
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