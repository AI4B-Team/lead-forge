import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { AccountTabs } from "@/components/app/account-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Circle,
  Download,
  Search,
  ShieldCheck,
  Clock,
  ArrowRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/compliance")({
  head: () => ({ meta: [{ title: "Compliance Center — LeadTrace" }] }),
  component: Compliance,
});

const REGISTRATION: Array<{ label: string; done: boolean; note: string }> = [
  { label: "Brand", done: true, note: "Registered Yesterday" },
  { label: "Campaign", done: true, note: "Registered 3 Hours Ago" },
  { label: "Sample Review", done: false, note: "Awaiting Carrier Approval" },
  { label: "Sending Live", done: false, note: "Locked Until Review Clears" },
];

const STATUS_CHECKS = [
  "10DLC Registered",
  "STOP Handling Enabled",
  "Reply Detection Active",
  "DNC Database Current",
  "Suppression Lists Active",
];

const AUDIT = [
  { date: "Mar 12, 2026", job: "Tampa HVAC Scrub", total: 3120, clean: 2140, dnc: 512, litigator: 47 },
  { date: "Mar 09, 2026", job: "Insurance Buyer Scrub", total: 1188, clean: 894, dnc: 271, litigator: 23 },
  { date: "Mar 04, 2026", job: "Probate Q1 Scrub", total: 402, clean: 340, dnc: 55, litigator: 7 },
];

function Compliance() {
  const [query, setQuery] = useState("");
  const [range, setRange] = useState("all");

  const done = REGISTRATION.filter((r) => r.done).length;
  const pct = Math.round((done / REGISTRATION.length) * 100);
  const health = 60 + pct * 0.38; // registration is the only gating item left
  const healthPct = Math.round(health);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AUDIT.filter((a) => !q || a.job.toLowerCase().includes(q));
  }, [query]);

  return (
    <div>
      <PageHeader
        title="Compliance Center"
        description="Everything Needed To Keep Outreach Compliant."
      />
      <AccountTabs current="compliance" />

      {/* Status banner — the first thing a compliance-minded buyer looks for. */}
      <div className="mb-6 rounded-2xl border border-success/30 bg-success/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/15 text-success">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Compliance Status
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl font-black text-success">Healthy</span>
                <span className="font-display text-lg font-bold text-foreground">{healthPct}%</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Last Checked 2 Minutes Ago
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_CHECKS.map((c) => (
            <span
              key={c}
              className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-background px-3 py-1.5 text-xs font-medium text-foreground"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
              {c}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between">
            <CardTitle className="text-base font-display">10DLC Registration</CardTitle>
            <span className="font-display text-sm font-bold text-foreground">{pct}% Complete</span>
          </CardHeader>
          <CardContent>
            <div className="mb-5 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-success transition-all" style={{ width: `${pct}%` }} />
            </div>
            <ol className="space-y-0">
              {REGISTRATION.map((r, i) => (
                <li key={r.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    {r.done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                    )}
                    {i < REGISTRATION.length - 1 && (
                      <span
                        className={`w-px flex-1 ${r.done ? "bg-success/40" : "bg-border"}`}
                        style={{ minHeight: 22 }}
                      />
                    )}
                  </div>
                  <div className="pb-4">
                    <div className={`text-sm font-medium ${r.done ? "text-foreground" : "text-muted-foreground"}`}>
                      {r.label}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.note}</div>
                  </div>
                </li>
              ))}
            </ol>
            <Button asChild className="mt-2 rounded-full">
              <Link to="/app/registration">
                Complete 10DLC <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-display">Global Suppression</CardTitle></CardHeader>
          <CardContent>
            <div className="font-display text-5xl font-black leading-none text-foreground">1,284</div>
            <div className="mt-2 text-sm text-muted-foreground">Across Every Campaign</div>
            <div className="my-5 h-px bg-border" />
            <div className="grid grid-cols-3 gap-3">
              <SupChip label="Opt-Out" value={412} tone="success" />
              <SupChip label="DNC" value={798} tone="warn" />
              <SupChip label="Manual" value={74} tone="muted" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle className="text-base font-display">Scrub Audit History</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Every Scrub Is Permanently Logged For Proof Of Compliance.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Jobs"
                className="h-9 w-48 rounded-full pl-8"
              />
            </div>
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-9 w-[150px] rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="30">Last 30 Days</SelectItem>
                <SelectItem value="90">Last 90 Days</SelectItem>
                <SelectItem value="365">Last 12 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="h-9 rounded-full">
              <Download className="mr-1 h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="p-4">Date</th>
                <th className="p-4">Job</th>
                <th className="p-4">Total</th>
                <th className="p-4">Clean / DNC / Litigator</th>
                <th className="p-4">Proof</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.job} className="border-b border-border last:border-0">
                  <td className="p-4 text-muted-foreground">{a.date}</td>
                  <td className="p-4 text-foreground font-medium">{a.job}</td>
                  <td className="p-4">{a.total.toLocaleString()}</td>
                  <td className="p-4">
                    <span className="text-success">{a.clean}</span> / <span className="text-warn">{a.dnc}</span> / <span className="text-danger">{a.litigator}</span>
                  </td>
                  <td className="p-4">
                    <Badge variant="outline" className="gap-1 border-success/30 text-success">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </Badge>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-muted-foreground">
                    No Scrub Runs Match That Search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SupChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warn" | "muted";
}) {
  const styles =
    tone === "success"
      ? "border-success/30 bg-success/5 text-success"
      : tone === "warn"
        ? "border-warn/30 bg-warn/5 text-warn"
        : "border-border bg-surface-muted text-muted-foreground";
  return (
    <div className={`rounded-xl border px-3 py-3 ${styles}`}>
      <div className="font-display text-2xl font-black leading-none">{value.toLocaleString()}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] opacity-80">{label}</div>
    </div>
  );
}