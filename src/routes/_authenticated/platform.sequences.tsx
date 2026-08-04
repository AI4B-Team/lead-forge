import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSequenceOverview } from "@/lib/sequences.functions";

export const Route = createFileRoute("/_authenticated/platform/sequences")({
  head: () => ({
    meta: [
      { title: "Sequences — LeadTrace Platform" },
      {
        name: "description",
        content: "Live multi-touch sequence health: status mix and the next scheduled sends.",
      },
      { property: "og:title", content: "Sequences — LeadTrace Platform" },
      {
        property: "og:description",
        content: "Live multi-touch sequence health: status mix and the next scheduled sends.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SequencesPage,
});

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  paused_human: "Paused — Human",
  paused_signal: "Paused — Signal",
  completed: "Completed",
  opted_out: "Opted Out",
  converted: "Converted",
  failed: "Failed",
};

function SequencesPage() {
  const fetchOverview = useServerFn(getSequenceOverview);
  const overviewQ = useQuery({
    queryKey: ["platform-sequence-overview"],
    queryFn: () => fetchOverview(),
    refetchInterval: 60_000,
  });
  const data = overviewQ.data;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageHeader
        title="Sequences"
        description="Every enrolled contact after touch one, and what the runner sends next."
      />

      {overviewQ.isLoading ? (
        <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading sequence state…
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Status Mix</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {(data?.counts ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No leads enrolled yet.</p>
              ) : (
                (data?.counts ?? []).map((c) => (
                  <Badge key={c.status} variant="secondary" className="font-normal">
                    {STATUS_LABEL[c.status] ?? c.status}: {c.count}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Next 100 Scheduled Sends</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Campaign</TableHead>
                    <TableHead>Touch</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Anchor</TableHead>
                    <TableHead>Scheduled</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.upcoming ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                        Nothing scheduled right now.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (data?.upcoming ?? []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.lead}</TableCell>
                        <TableCell className="text-muted-foreground">{r.workspace}</TableCell>
                        <TableCell className="text-muted-foreground">{r.campaign}</TableCell>
                        <TableCell>{r.step}</TableCell>
                        <TableCell>{r.sends}</TableCell>
                        <TableCell className="text-muted-foreground">{r.anchor_type}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {r.next_send_at ? new Date(r.next_send_at).toLocaleString() : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
