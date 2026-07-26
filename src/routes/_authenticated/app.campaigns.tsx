import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_CAMPAIGNS } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/campaigns")({
  head: () => ({ meta: [{ title: "Campaigns — LeadTrace" }] }),
  component: Campaigns,
});

function Campaigns() {
  return (
    <div>
      <PageHeader
        title="Campaigns"
        description="Only Clean Files Can Be Loaded. Reply-Stops-Drip Is Automatic."
        actions={
          <Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> New Campaign</Button>
        }
      />
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