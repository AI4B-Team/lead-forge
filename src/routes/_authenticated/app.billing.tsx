import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MOCK_CREDITS } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/app/billing")({
  head: () => ({ meta: [{ title: "Billing — LeadTrace" }] }),
  component: Billing,
});

function Billing() {
  return (
    <div className="max-w-4xl">
      <PageHeader title="Billing" description="Plan And Metered Credits." />

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-display">Current Plan</CardTitle>
            <div className="text-sm text-muted-foreground mt-1">Growth · $197/mo · Renews Apr 12</div>
          </div>
          <Badge>Most Popular</Badge>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button variant="outline" className="rounded-full">Change Plan</Button>
          <Button variant="ghost" className="rounded-full text-muted-foreground">Cancel</Button>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <CreditCard label="Scrape" balance={MOCK_CREDITS.scrape} rate="$3 / 1,000 Records" />
        <CreditCard label="Skip Trace" balance={MOCK_CREDITS.skipTrace} rate="$8 / 1,000 Traces" />
        <CreditCard label="SMS" balance={MOCK_CREDITS.sms} rate="$0.008 / Segment" />
      </div>
    </div>
  );
}

function CreditCard({ label, balance, rate }: { label: string; balance: number; rate: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
        <div className="mt-2 font-display text-3xl font-black text-foreground">{balance.toLocaleString()}</div>
        <div className="text-xs text-muted-foreground mt-1">{rate}</div>
        <Button className="w-full rounded-full mt-4">Top Up</Button>
      </CardContent>
    </Card>
  );
}