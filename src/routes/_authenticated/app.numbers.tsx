import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_NUMBERS } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/numbers")({
  head: () => ({ meta: [{ title: "Numbers — LeadTrace" }] }),
  component: Numbers,
});

function Numbers() {
  const avg = Math.round(
    MOCK_NUMBERS.reduce((a, n) => a + n.healthScore, 0) / MOCK_NUMBERS.length,
  );
  return (
    <div>
      <PageHeader
        title="Number Pool"
        description="Geo-Matched By Region. Auto-Retirement When Opt-Out Rate Climbs."
        actions={<Button className="rounded-full"><Plus className="mr-1 h-4 w-4" /> Add Number</Button>}
      />
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Numbers" value={MOCK_NUMBERS.length.toString()} />
        <StatCard label="Active" value={MOCK_NUMBERS.filter((n) => n.status === "active").length.toString()} />
        <StatCard label="Avg Health" value={`${avg}/100`} tone="success" />
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="p-4">Phone</th>
                <th className="p-4">Region</th>
                <th className="p-4">Health</th>
                <th className="p-4">Opt-Out Rate</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_NUMBERS.map((n) => (
                <tr key={n.id} className="border-b border-border last:border-0">
                  <td className="p-4 font-medium text-foreground">{n.phone}</td>
                  <td className="p-4 text-muted-foreground">{n.region}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full ${n.healthScore > 80 ? "bg-success" : n.healthScore > 60 ? "bg-warn" : "bg-danger"}`} style={{ width: `${n.healthScore}%` }} />
                      </div>
                      <span className="text-foreground">{n.healthScore}</span>
                    </div>
                  </td>
                  <td className="p-4 text-muted-foreground">{n.optOutRate.toFixed(1)}%</td>
                  <td className="p-4">
                    <Badge variant="outline" className={
                      n.status === "active" ? "bg-success/10 text-success border-success/20" :
                      n.status === "cooling" ? "bg-warn/10 text-warn border-warn/20" :
                      "bg-danger/10 text-danger border-danger/20"
                    }>
                      {n.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: "success" }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">{label}</div>
        <div className={`mt-2 font-display text-3xl font-black ${tone === "success" ? "text-success" : "text-foreground"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}