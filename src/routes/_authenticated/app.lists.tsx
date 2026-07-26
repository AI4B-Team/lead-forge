import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MOCK_JOBS, statusLabel } from "@/lib/mock-data";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/lists")({
  head: () => ({ meta: [{ title: "Lists — LeadTrace" }] }),
  component: Lists,
});

function Lists() {
  const sourceLabel = { business: "Business", records: "Public Records", upload: "Upload" };
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
              {MOCK_JOBS.map((j) => (
                <tr key={j.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
                  <td className="p-4">
                    <Link to="/app/jobs/$jobId" params={{ jobId: j.id }} className="font-medium text-foreground hover:text-primary">
                      {j.name}
                    </Link>
                  </td>
                  <td className="p-4 text-muted-foreground">{sourceLabel[j.sourceType]}</td>
                  <td className="p-4 text-foreground">{j.rowsIn.toLocaleString()}</td>
                  <td className="p-4 text-muted-foreground">
                    <span className="text-success font-medium">{j.clean.toLocaleString()}</span> /{" "}
                    <span className="text-warn font-medium">{j.dnc.toLocaleString()}</span> /{" "}
                    <span className="text-danger font-medium">{j.litigator.toLocaleString()}</span>
                  </td>
                  <td className="p-4"><Badge variant="outline">{statusLabel(j.status)}</Badge></td>
                  <td className="p-4 text-muted-foreground">{j.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}