import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { StatusBadge } from "@/components/app/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { listJobs } from "@/lib/jobs.functions";
import type { JobStatus } from "@/lib/mock-data";

export const Route = createFileRoute("/_authenticated/app/lists")({
  head: () => ({ meta: [{ title: "Lists — LeadTrace" }] }),
  component: Lists,
});

const SOURCE_LABEL: Record<string, string> = {
  business: "Business",
  records: "Public Records",
  upload: "Upload",
};

function Lists() {
  const { workspaceId } = useWorkspaceId();
  const fetchJobs = useServerFn(listJobs);
  const { data, isLoading } = useQuery({
    queryKey: ["jobs-list", workspaceId],
    queryFn: () => fetchJobs({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
    refetchInterval: 5000,
  });

  const [q, setQ] = useState("");
  const [source, setSource] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");

  const rows = useMemo(() => {
    const jobs = data?.jobs ?? [];
    const needle = q.trim().toLowerCase();
    return jobs.filter((j) => {
      if (source !== "all" && j.source_type !== source) return false;
      if (status !== "all" && j.status !== status) return false;
      if (needle && !j.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [data, q, source, status]);

  return (
    <div>
      <PageHeader
        title="Lists"
        description="Every Job You Have Run. Click A Row To Open The Pipeline Review."
        actions={
          <Button asChild className="rounded-full">
            <Link to="/app/new-job"><Plus className="mr-1 h-4 w-4" /> New Job</Link>
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search Lists…"
              className="pl-9"
            />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="md:w-[180px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="records">Public Records</SelectItem>
              <SelectItem value="upload">Upload</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="md:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="scraping">Scraping</SelectItem>
              <SelectItem value="scrubbing">Scrubbing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="p-4">Name</th>
                <th className="p-4">Source</th>
                <th className="p-4">Rows</th>
                <th className="p-4">Clean / DNC / Litigator</th>
                <th className="p-4">Status</th>
                <th className="p-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Loading Lists…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No Lists Match. <Link to="/app/new-job" className="text-primary underline">Start A New Job</Link>.
                </td></tr>
              )}
              {rows.map((j) => (
                <tr key={j.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
                  <td className="p-4">
                    <Link to="/app/jobs/$jobId" params={{ jobId: j.id }} className="font-medium text-foreground hover:text-primary">
                      {j.name}
                    </Link>
                  </td>
                  <td className="p-4 text-muted-foreground">{SOURCE_LABEL[j.source_type] ?? j.source_type}</td>
                  <td className="p-4 text-foreground">{(j.rows_in ?? 0).toLocaleString()}</td>
                  <td className="p-4 text-muted-foreground">
                    <span className="text-success font-medium">{j.counts.clean.toLocaleString()}</span> /{" "}
                    <span className="text-warn font-medium">{j.counts.dnc.toLocaleString()}</span> /{" "}
                    <span className="text-danger font-medium">{j.counts.litigator.toLocaleString()}</span>
                  </td>
                  <td className="p-4"><StatusBadge status={(j.status ?? "queued") as JobStatus} /></td>
                  <td className="p-4 text-muted-foreground">{new Date(j.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}