import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Users, ShieldCheck, ShieldAlert, Ban, Sparkles, Layers } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { listLeadRecords } from "@/lib/monitoring.functions";
import { RECORD_TYPE_LABEL } from "@/lib/monitoring.shared";
import { PhoneLink } from "@/components/app/phone-link";

export const Route = createFileRoute("/_authenticated/app/leads")({
  validateSearch: (search: Record<string, unknown>) => ({
    onlyNew: search.onlyNew === true || search.onlyNew === "true",
  }),
  head: () => ({
    meta: [
      { title: "Leads — LeadTrace" },
      { name: "description", content: "Every record you own, de-duplicated across every list — with disposition, source, and how many lists each record appeared in." },
    ],
  }),
  component: LeadsPage,
});

const SOURCE_LABEL: Record<string, string> = {
  business: "Business",
  records: "Public Records",
  upload: "Upload",
  social: "Social",
};

const DISPOSITION_TONE: Record<string, string> = {
  clean: "bg-success/10 text-success border-success/20",
  dnc: "bg-warn/10 text-warn border-warn/20",
  litigator: "bg-danger/10 text-danger border-danger/20",
};

function Stat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
          {icon}
          <span>{label}</span>
        </div>
        <div className={`mt-2 font-display text-2xl font-bold ${tone ?? "text-foreground"}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function LeadsPage() {
  const { workspaceId } = useWorkspaceId();
  const { onlyNew: onlyNewParam } = Route.useSearch();
  const fetchRecords = useServerFn(listLeadRecords);

  const [q, setQ] = useState("");
  const [disposition, setDisposition] = useState<"all" | "clean" | "dnc" | "litigator">("all");
  const [sourceType, setSourceType] = useState("all");
  const [lineType, setLineType] = useState<"all" | "mobile" | "landline" | "voip" | "unknown">("all");
  const [onlyNew, setOnlyNew] = useState<boolean>(onlyNewParam === true);
  const [multiList, setMultiList] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["lead-records", workspaceId, q, disposition, sourceType, lineType, onlyNew, multiList],
    queryFn: () =>
      fetchRecords({
        data: {
          workspaceId: workspaceId!,
          disposition,
          sourceType,
          lineType,
          onlyNew,
          multiList,
          ...(q.trim() ? { search: q.trim() } : {}),
        },
      }),
    enabled: !!workspaceId,
  });

  const stats = data?.stats;
  const rows = data?.rows ?? [];
  const byRecordType = Object.entries(data?.byRecordType ?? {});
  const bySource = Object.entries(data?.bySource ?? {});

  return (
    <div>
      <PageHeader
        title="Leads"
        description="Every Record You Own, De-Duplicated Across Every List."
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat icon={<Users className="h-4 w-4" />} label="Total Leads" value={(stats?.total ?? 0).toLocaleString()} />
        <Stat icon={<ShieldCheck className="h-4 w-4" />} label="Clean / Textable" value={(stats?.clean ?? 0).toLocaleString()} tone="text-success" />
        <Stat icon={<ShieldAlert className="h-4 w-4" />} label="DNC Suppressed" value={(stats?.dnc ?? 0).toLocaleString()} tone="text-warn" />
        <Stat icon={<Ban className="h-4 w-4" />} label="Litigators Blocked" value={(stats?.litigator ?? 0).toLocaleString()} tone="text-danger" />
        <Stat icon={<Sparkles className="h-4 w-4" />} label="New This Week" value={(stats?.newThisWeek ?? 0).toLocaleString()} tone="text-primary" />
      </div>

      {(bySource.length > 0 || byRecordType.length > 0) && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="uppercase tracking-wide">By Source</span>
          {bySource.map(([s, n]) => (
            <Badge key={s} variant="secondary" className="font-normal">
              {SOURCE_LABEL[s] ?? s} · {n.toLocaleString()}
            </Badge>
          ))}
          {byRecordType.length > 0 && <span className="ml-2 uppercase tracking-wide">By Record Type</span>}
          {byRecordType.map(([t, n]) => (
            <Badge key={t} variant="outline" className="font-normal">
              {RECORD_TYPE_LABEL[t] ?? t} · {n.toLocaleString()}
            </Badge>
          ))}
        </div>
      )}

      <Card className="mt-6 mb-4">
        <CardContent className="p-4 flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search Name, Phone, City…" className="pl-9" />
          </div>
          <Select value={disposition} onValueChange={(v) => setDisposition(v as typeof disposition)}>
            <SelectTrigger className="lg:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dispositions</SelectItem>
              <SelectItem value="clean">Clean</SelectItem>
              <SelectItem value="dnc">DNC</SelectItem>
              <SelectItem value="litigator">Litigator</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sourceType} onValueChange={setSourceType}>
            <SelectTrigger className="lg:w-[170px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="business">Business</SelectItem>
              <SelectItem value="records">Public Records</SelectItem>
              <SelectItem value="upload">Upload</SelectItem>
            </SelectContent>
          </Select>
          <Select value={lineType} onValueChange={(v) => setLineType(v as typeof lineType)}>
            <SelectTrigger className="lg:w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Line Types</SelectItem>
              <SelectItem value="mobile">Mobile</SelectItem>
              <SelectItem value="landline">Landline</SelectItem>
              <SelectItem value="voip">VoIP</SelectItem>
              <SelectItem value="unknown">Unknown</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={onlyNew ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setOnlyNew((v) => !v)}
            >
              New Since Last Run
            </Button>
            <Button
              type="button"
              variant={multiList ? "default" : "outline"}
              className="rounded-full"
              onClick={() => setMultiList((v) => !v)}
            >
              <Layers className="mr-1 h-4 w-4" /> Multi-List
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="p-4">Name / Business</th>
                <th className="p-4">Phone</th>
                <th className="p-4">Line Type</th>
                <th className="p-4">Disposition</th>
                <th className="p-4">Source</th>
                <th className="p-4">Lists</th>
                <th className="p-4">Location</th>
                <th className="p-4">First / Last Seen</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Loading Leads…</td></tr>
              )}
              {!isLoading && rows.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">
                  No Records Match These Filters Yet.
                </td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-muted">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{r.business_name || r.full_name || "—"}</span>
                      {r.is_new && <Badge className="bg-primary text-primary-foreground text-[10px]">NEW</Badge>}
                    </div>
                    {r.business_name && r.full_name && (
                      <div className="text-xs text-muted-foreground">{r.full_name}</div>
                    )}
                  </td>
                  <td className="p-4">{r.phone ? <PhoneLink phone={r.phone} /> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-4 text-muted-foreground capitalize">{r.phone_type ?? "unknown"}</td>
                  <td className="p-4">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${DISPOSITION_TONE[r.disposition] ?? "border-border text-muted-foreground"}`}>
                      {r.disposition}
                    </span>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {(r.source_types ?? []).map((s) => SOURCE_LABEL[s] ?? s).join(", ") || "—"}
                  </td>
                  <td className="p-4">
                    <Badge variant={r.list_count > 1 ? "default" : "secondary"} className="font-normal">
                      {r.list_count}
                    </Badge>
                  </td>
                  <td className="p-4 text-muted-foreground">
                    {[r.city, r.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="p-4 text-muted-foreground whitespace-nowrap">
                    {new Date(r.first_seen_at).toLocaleDateString()} → {new Date(r.last_seen_at).toLocaleDateString()}
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
