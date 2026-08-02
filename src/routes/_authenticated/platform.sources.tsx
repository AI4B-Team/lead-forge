import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listSourceDemand, listSourceRequesters } from "@/lib/admin.functions";
import { FREQUENCY_LABEL, LOGIN_LABEL } from "@/lib/source-request.shared";

export const Route = createFileRoute("/_authenticated/platform/sources")({
  head: () => ({
    meta: [
      { title: "Source Requests — LeadTrace Platform" },
      {
        name: "description",
        content: "Adapter roadmap ordered by real workspace demand for requested data sources.",
      },
    ],
  }),
  component: SourceRequestsPage,
});

function SourceRequestsPage() {
  const fetchDemand = useServerFn(listSourceDemand);
  const fetchRequesters = useServerFn(listSourceRequesters);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const demandQ = useQuery({
    queryKey: ["admin-source-demand"],
    queryFn: () => fetchDemand(),
  });
  const requestersQ = useQuery({
    queryKey: ["admin-source-requesters", openKey],
    queryFn: () => fetchRequesters({ data: { sourceKey: openKey as string } }),
    enabled: Boolean(openKey),
  });

  const rows = demandQ.data?.demand ?? [];

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Source Requests"
        description="Grouped By Requested Source. Order The Adapter Roadmap By Workspaces, Not Raw Request Count."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-display">
            <Layers className="h-4 w-4 text-primary" /> Requested Sources
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {demandQ.isLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              No Source Requests Yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-[90px]">Workspaces</TableHead>
                  <TableHead className="w-[80px]">Queued</TableHead>
                  <TableHead className="w-[90px]">In Review</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead className="w-[130px]">Cadence</TableHead>
                  <TableHead className="w-[110px]">Last Ask</TableHead>
                  <TableHead className="w-[110px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((d) => (
                  <TableRow key={d.source_key}>
                    <TableCell>
                      <div className="font-medium">{d.display_label}</div>
                      {d.sample_url && (
                        <div className="max-w-[260px] truncate text-[11px] text-muted-foreground">
                          {d.sample_url}
                        </div>
                      )}
                      {Number(d.screened_out) > 0 && (
                        <Badge
                          variant="outline"
                          className="mt-1 border-warning/40 text-[10px] text-warning"
                        >
                          {Number(d.screened_out)} Screened Out
                        </Badge>
                      )}
                      {(d.logins ?? []).length > 0 && (
                        <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {(d.logins ?? []).map((l: string) => LOGIN_LABEL[l] ?? l).join(" · ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {Number(d.workspaces).toLocaleString()}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {Number(d.queued).toLocaleString()}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {Number(d.needs_review ?? 0) > 0 ? (
                        <Badge
                          variant="outline"
                          className="border-warning/40 text-[10px] text-warning"
                        >
                          {Number(d.needs_review)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(d.desired_fields ?? []).slice(0, 4).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {(d.frequencies ?? [])
                        .map((f: string) => FREQUENCY_LABEL[f] ?? f)
                        .join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {d.last_requested_at
                        ? new Date(d.last_requested_at).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="ghost" onClick={() => setOpenKey(d.source_key)}>
                        Notify List
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(openKey)} onOpenChange={(o) => !o && setOpenKey(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Notify When Live</DialogTitle>
          </DialogHeader>
          {requestersQ.isLoading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workspace</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-[110px]">Cadence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(requestersQ.data?.requesters ?? []).map((r) => (
                  <TableRow key={r.request_id}>
                    <TableCell className="font-medium">{r.workspace_name ?? "—"}</TableCell>
                    <TableCell className="text-xs">{r.email ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {FREQUENCY_LABEL[r.frequency] ?? r.frequency}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
