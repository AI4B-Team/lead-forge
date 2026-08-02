import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { PIPELINE_OPTION_LABELS } from "@/lib/pipeline-options";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { UploadCloud } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { runJob } from "@/lib/pipeline.functions";
import type { ColumnMap } from "@/lib/csv";
import { attachmentRows, readAttachment, type UploadAttachment } from "@/lib/upload-attachment";
import { ColumnMapper } from "@/components/app/column-mapper";
import { queueJob } from "@/lib/job-submit";

export const Route = createFileRoute("/_authenticated/app/new-list/upload")({
  validateSearch: (search: Record<string, unknown>) => ({
    reattach: search['reattach'] === "1" || search['reattach'] === true,
  }),
  head: () => ({ meta: [{ title: "Upload My List — LeadTrace" }] }),
  component: Wizard,
});

function Wizard() {
  const navigate = useNavigate();
  const { reattach } = Route.useSearch();
  const { workspaceId } = useWorkspaceId();
  const runJobFn = useServerFn(runJob);
  const [file, setFile] = useState<File | null>(null);
  const [attached, setAttached] = useState<UploadAttachment | null>(null);
  const [parsing, setParsing] = useState(false);
  const [mapping, setMapping] = useState<ColumnMap>({});
  const [skipTrace, setSkipTrace] = useState(true);
  const [busy, setBusy] = useState(false);

  const onFile = async (f: File | null) => {
    setFile(f);
    setAttached(null);
    if (!f) return;
    setParsing(true);
    try {
      const next = await readAttachment(f); // XLSX still maps server-side
      setAttached(next);
      setMapping(next.map);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Read CSV");
    } finally {
      setParsing(false);
    }
  };

  const run = async () => {
    if (!workspaceId) return;
    if (!file) {
      toast.error("Choose A File First.");
      return;
    }
    setBusy(true);
    try {
      const { id, duplicate } = await queueJob(supabase, {
        workspaceId,
        sourceType: "upload",
        params: {
          file_name: file.name,
          file_size: file.size,
          mapping,
          skip_trace: skipTrace,
          rows: attached ? attachmentRows({ ...attached, map: mapping }) : null,
        },
      });
      navigate({ to: "/app/lists/$listId", params: { listId: id } });
      if (duplicate) {
        toast.info("This File Was Already Queued — Opening That Run.");
        return;
      }
      toast.success("List Queued. Running Pipeline…");
      runJobFn({ data: { jobId: id } }).catch((e) =>
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
      {reattach && (
        <div className="mb-4 rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-foreground">
          Re-attach Your File To Continue — Browsers Can't Carry Files Across Pages.
        </div>
      )}
      <Card>
        <CardContent className="pt-6 space-y-6">
          <label className="block rounded-2xl border-2 border-dashed border-border bg-surface-muted p-10 text-center cursor-pointer hover:border-primary transition">
            <UploadCloud className="h-8 w-8 mx-auto text-muted-foreground" />
            <div className="mt-3 font-medium text-foreground">
              {file ? file.name : "Drop A CSV Or XLSX File"}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {parsing
                ? "Parsing…"
                : attached?.parseable
                  ? `${attached.rowCount.toLocaleString()} Rows Detected`
                  : file
                    ? `${(file.size / 1024).toFixed(1)} KB`
                    : "Up To 25,000 Rows Per CSV Upload"}
            </div>
            <input
              type="file"
              className="hidden"
              accept=".csv,.xlsx"
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
          </label>

          {attached?.parseable && (
            <div>
              <Label>Column Mapping</Label>
              <div className="mt-2">
                <ColumnMapper headers={attached.headers} value={mapping} onChange={setMapping} />
              </div>
            </div>
          )}

          <div className="space-y-3 rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">{PIPELINE_OPTION_LABELS.skipTrace}</span>
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
              <Link to="/app/new-list">Back</Link>
            </Button>
            <Button className="rounded-full" onClick={run} disabled={busy || !workspaceId || !file}>
              {busy ? "Queuing…" : "Run List"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}