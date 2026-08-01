import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { COUNTIES, RECORD_TYPES } from "@/lib/mock-data";
import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { runJob } from "@/lib/pipeline.functions";

export const Route = createFileRoute("/_authenticated/app/new-job/records")({
  head: () => ({ meta: [{ title: "Scrape Public Records — LeadTrace" }] }),
  component: Wizard,
});

function Wizard() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspaceId();
  const runJobFn = useServerFn(runJob);
  const [record, setRecord] = useState<string>("Probate");
  const [county, setCounty] = useState<string>("Hillsborough, FL");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  const countyMeta = COUNTIES.find((c) => c.name === county);

  const requestCounty = async () => {
    if (!workspaceId) return;
    const name = window.prompt("Which County? (E.g. Orange, CA)");
    if (!name) return;
    const { error } = await supabase
      .from("adapter_requests")
      .insert({ workspace_id: workspaceId, county: name, record_type: record });
    if (error) toast.error(error.message);
    else toast.success("Request Logged. We'll Add It To The Backlog.");
  };

  const run = async () => {
    if (!workspaceId) return;
    if (countyMeta?.coverage === "requested") {
      toast.error("This County Isn't Live Yet. Please Request It.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          workspace_id: workspaceId,
          source_type: "records",
          status: "queued",
          params: {
            // §9.5 auto-name format: {Niche} – {Geography} – {Mon DD}
            name: `${record} – ${county} – ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
            record_type: record,
            county,
            date_from: from || null,
            date_to: to || null,
          },
        })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Could Not Queue Job");
      toast.success("Job Queued. Running Pipeline…");
      navigate({ to: "/app/jobs/$jobId", params: { jobId: data.id } });
      runJobFn({ data: { jobId: data.id } }).catch((e) =>
        toast.error(e instanceof Error ? e.message : "Pipeline Failed"),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="Scrape Public Records" description="Door B · County + Record Type" />
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div>
            <Label>Record Type</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {RECORD_TYPES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRecord(r)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                    record === r
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface text-foreground border-border"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label>County</Label>
            <div className="mt-2 grid sm:grid-cols-2 gap-2">
              {COUNTIES.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setCounty(c.name)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                    county === c.name ? "border-primary bg-primary/5" : "border-border bg-surface"
                  }`}
                >
                  <span className="text-foreground">{c.name}</span>
                  <CoverageBadge coverage={c.coverage} />
                </button>
              ))}
            </div>
            <Button variant="ghost" size="sm" className="mt-3 text-primary" onClick={requestCounty}>
              <Plus className="h-4 w-4 mr-1" /> Request A County
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from">From</Label>
              <Input id="from" type="date" className="mt-1" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="to">To</Label>
              <Input id="to" type="date" className="mt-1" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/app/new-job">Back</Link>
            </Button>
            <Button className="rounded-full" onClick={run} disabled={busy || !workspaceId}>
              {busy ? "Queuing…" : "Run Job"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CoverageBadge({ coverage }: { coverage: string }) {
  const map: Record<string, string> = {
    live: "bg-success/10 text-success border-success/20",
    beta: "bg-warn/10 text-warn border-warn/20",
    requested: "bg-muted text-muted-foreground border-border",
  };
  return (
    <Badge variant="outline" className={`text-[10px] uppercase ${map[coverage]}`}>
      {coverage}
    </Badge>
  );
}