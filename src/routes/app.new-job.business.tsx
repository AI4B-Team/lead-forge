import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NICHES } from "@/lib/mock-data";
import { useState } from "react";

export const Route = createFileRoute("/app/new-job/business")({
  head: () => ({ meta: [{ title: "Scrape A Niche — LeadTrace" }] }),
  component: Wizard,
});

function Wizard() {
  const [picked, setPicked] = useState<string[]>(["HVAC"]);
  const toggle = (n: string) =>
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));

  return (
    <div className="max-w-3xl">
      <PageHeader title="Scrape A Niche" description="Door A · Business Scrape" />
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div>
            <Label>Niches</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {NICHES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggle(n)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                    picked.includes(n)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface text-foreground border-border"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">State</Label>
              <Input id="state" placeholder="Florida" defaultValue="Florida" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="counties">Counties</Label>
              <Input id="counties" placeholder="Hillsborough, Pasco, Pinellas..." className="mt-1" />
            </div>
          </div>
          <div className="space-y-3 rounded-lg border border-border p-4">
            <ToggleRow label="Remove Franchises And Chains" defaultChecked />
            <ToggleRow label="Require Mobile-Reachable" defaultChecked />
            <ToggleRow label="Avoid Major Metros" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/app/new-job">Back</Link>
            </Button>
            <Button asChild className="rounded-full">
              <Link to="/app/jobs/$jobId" params={{ jobId: "job_01" }}>Run Job</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}