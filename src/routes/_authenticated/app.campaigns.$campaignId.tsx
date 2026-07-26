import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MOCK_CAMPAIGNS } from "@/lib/mock-data";
import { Pause, Play } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/campaigns/$campaignId")({
  head: () => ({ meta: [{ title: "Campaign Detail — LeadTrace" }] }),
  loader: ({ params }) => {
    const c = MOCK_CAMPAIGNS.find((x) => x.id === params.campaignId);
    if (!c) throw notFound();
    return { campaign: c };
  },
  component: CampaignDetail,
});

const STEPS = [
  { order: 1, delay: "Immediately", variants: 3, body: "Hey {{FirstName}}, Quick Question About Your Property At {{Address}}." },
  { order: 2, delay: "3 Hours", variants: 2, body: "Just Checking Back — Any Interest In A Cash Offer?" },
  { order: 3, delay: "2 Days", variants: 2, body: "Last Follow-Up. I'll Take You Off The List If No Reply." },
  { order: 4, delay: "5 Days", variants: 1, body: "Circling Back One More Time — Fair To Assume No?" },
];

function CampaignDetail() {
  const { campaign } = Route.useLoaderData();
  return (
    <div>
      <PageHeader
        title={campaign.name}
        description="4-Touch Drip · Message Variants Rotate · Reply Halts Remaining Steps."
        actions={
          <>
            <Badge variant="outline" className="uppercase">{campaign.status}</Badge>
            <Button className="rounded-full" variant="outline">
              {campaign.status === "sending" ? <><Pause className="mr-1 h-4 w-4" /> Pause</> : <><Play className="mr-1 h-4 w-4" /> Resume</>}
            </Button>
          </>
        }
      />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat label="Recipients" value={campaign.recipients} />
        <Stat label="Sent" value={campaign.sent} />
        <Stat label="Delivered" value={campaign.delivered} />
        <Stat label="Replies" value={campaign.replies} tone="success" />
        <Stat label="Opt-Outs" value={campaign.optOuts} tone="warn" />
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle className="text-base font-display">Drip Steps</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-3">
            {STEPS.map((s) => (
              <div key={s.order} className="rounded-xl border border-border p-4">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-foreground">Touch {s.order}</div>
                  <div className="text-muted-foreground">{s.delay} · {s.variants} Variants</div>
                </div>
                <div className="mt-2 text-sm text-foreground">{s.body}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 text-right">
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/app/campaigns">Back To Campaigns</Link>
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "success" | "warn" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "warn" ? "text-warn" : "text-foreground";
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
        <div className={`mt-2 font-display text-2xl font-black ${toneClass}`}>{value.toLocaleString()}</div>
      </CardContent>
    </Card>
  );
}