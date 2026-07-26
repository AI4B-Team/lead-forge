import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UploadCloud } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { runJob } from "@/lib/pipeline.functions";

export const Route = createFileRoute("/_authenticated/app/new-job/upload")({
  head: () => ({ meta: [{ title: "Upload My List — LeadTrace" }] }),
  component: Wizard,
});

function Wizard() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspaceId();
  const runJobFn = useServerFn(runJob);
  const columns = ["Full Name", "Phone", "Email", "Address", "City", "State", "Zip"];
  const [file, setFile] = useState<File | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>(
    Object.fromEntries(columns.map((c) => [c, c])),
  );
  const [skipTrace, setSkipTrace] = useState(true);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!workspaceId) return;
    if (!file) {
      toast.error("Choose A File First.");
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          workspace_id: workspaceId,
          source_type: "upload",
          status: "queued",
          params: {
            name: file.name,
            file_name: file.name,
            file_size: file.size,
            mapping,
            skip_trace: skipTrace,
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
    <div className="max-w-3xl">
      <PageHeader title="Upload My List" description="Door C · Bring Your Own Data" />
      <Card>
        <CardContent className="pt-6 space-y-6">
          <label className="block rounded-2xl border-2 border-dashed border-border bg-surface-muted p-10 text-center cursor-pointer hover:border-primary transition">
            <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="mt-3 font-medium text-foreground">
              {file ? file.name : "Drop A CSV Or XLSX File"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {file ? `${(file.size / 1024).toFixed(1)} KB` : "Up To 100,000 Rows Per Upload"}
            </div>
            <input
              type="file"
              className="hidden"
              accept=".csv,.xlsx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </label>

          <div>
            <Label>Column Mapping</Label>
            <div className="mt-2 grid sm:grid-cols-2 gap-3">
              {columns.map((c) => (
                <div key={c} className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2">
                  <span className="text-sm text-foreground">{c}</span>
                  <Select
                    value={mapping[c]}
                    onValueChange={(v) => setMapping((m) => ({ ...m, [c]: v }))}
                  >
                    <SelectTrigger className="w-40 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {columns.map((cc) => (
                        <SelectItem key={cc} value={cc}>{cc}</SelectItem>
                      ))}
                      <SelectItem value="__skip">Skip Column</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">Skip Trace Missing Fields</span>
              <Switch checked={skipTrace} onCheckedChange={setSkipTrace} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Scrub Now (DNC + Litigator)</span>
              <Switch defaultChecked disabled />
            </div>
            <div className="text-xs text-muted-foreground">Scrubbing Is Non-Bypassable.</div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/app/new-job">Back</Link>
            </Button>
            <Button className="rounded-full" onClick={run} disabled={busy || !workspaceId || !file}>
              {busy ? "Queuing…" : "Run Job"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}