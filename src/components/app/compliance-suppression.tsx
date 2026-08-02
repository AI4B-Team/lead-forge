/**
 * Evidence-ready compliance surfaces (spec §21):
 *   1. Searchable suppression list (phone / reason / date / source), paginated.
 *   2. Per-contact lookup — one timeline of suppression + messages + refused sends.
 *   3. Blocked-attempt log — "we refused to text this person on these dates".
 * Every view exports CSV, because these are the documents handed to counsel.
 */
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Ban, ChevronLeft, ChevronRight, Download, Search, ShieldOff, Upload, User,
  ArrowUpRight, ArrowDownLeft, Bot, CircleSlash,
} from "lucide-react";
import {
  listSuppression, listBlockedAttempts, lookupContact, importSuppression,
} from "@/lib/compliance.functions";
import { downloadCsv, toCsv } from "@/lib/export-file";
import { parseCsv } from "@/lib/csv";

const REASON_LABEL: Record<string, string> = {
  opt_out: "Opt-Out",
  dnc: "DNC",
  manual: "Manual",
};

const PATH_LABEL: Record<string, string> = {
  manual: "Manual Send",
  campaign: "Campaign",
  bot: "AI Agent",
  cadence: "Cadence",
  unknown: "Unknown",
};

function fmtDate(v: string) {
  return new Date(v).toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function ReasonBadge({ bucket }: { bucket: string }) {
  const cls =
    bucket === "opt_out"
      ? "border-danger/30 text-danger"
      : bucket === "dnc"
        ? "border-warn/40 text-warn"
        : "border-border text-muted-foreground";
  return (
    <Badge variant="outline" className={cls}>
      {REASON_LABEL[bucket] ?? "Manual"}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Searchable suppression list                                      */
/* ------------------------------------------------------------------ */
export function SuppressionTable({ workspaceId }: { workspaceId: string | null | undefined }) {
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 25;
  const run = useServerFn(listSuppression);

  const { data, isLoading } = useQuery({
    queryKey: ["suppression-list", workspaceId, query, reason, page],
    queryFn: () =>
      run({ data: { workspaceId: workspaceId!, query, reason, page, pageSize, all: false } }),
    enabled: !!workspaceId,
  });

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));

  async function exportAll() {
    const full = await run({
      data: { workspaceId: workspaceId!, query: "", reason: "all", page: 0, pageSize, all: true },
    });
    if (full.rows.length === 0) {
      toast.error("Nothing To Export Yet.");
      return;
    }
    downloadCsv(
      `suppression-list-${stamp()}.csv`,
      toCsv(
        full.rows.map((r) => ({
          phone: r.phone,
          reason: REASON_LABEL[r.bucket] ?? r.reason,
          raw_reason: r.reason,
          source: r.source,
          note: r.note ?? "",
          date_added: new Date(r.created_at).toISOString(),
        })),
      ),
    );
    toast.success(`Exported ${full.rows.length.toLocaleString()} Suppressed Numbers.`);
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-base font-display">Suppression List</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Search Any Number To Confirm Whether It Is Suppressed,
            <br />
            Since When & Why.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(0);
              }}
              placeholder="Search Phone Number"
              className="h-9 w-52 rounded-full pl-8"
            />
          </div>
          <Select
            value={reason}
            onValueChange={(v) => {
              setReason(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="h-9 w-[150px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reasons</SelectItem>
              <SelectItem value="opt_out">Opt-Out</SelectItem>
              <SelectItem value="dnc">DNC</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>
          <BlacklistDialog workspaceId={workspaceId} />
          <Button
            variant="outline"
            className="h-9 rounded-full"
            onClick={() => void exportAll()}
          >
            <Download className="mr-1 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-4">Phone</th>
              <th className="p-4">Reason</th>
              <th className="p-4">Date Added</th>
              <th className="p-4">Source</th>
              <th className="p-4">Note</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.phone}-${r.created_at}`} className="border-b border-border last:border-0">
                <td className="p-4 font-medium text-foreground">{r.phone}</td>
                <td className="p-4"><ReasonBadge bucket={r.bucket} /></td>
                <td className="p-4 text-muted-foreground">{fmtDate(r.created_at)}</td>
                <td className="p-4 text-muted-foreground">{r.source}</td>
                <td className="p-4 text-muted-foreground">{r.note ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">
                  {isLoading
                    ? "Loading Suppression List…"
                    : query
                      ? "That Number Is Not On Your Suppression List."
                      : "No Suppressed Numbers Yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > pageSize && (
          <div className="flex items-center justify-between border-t border-border p-4 text-xs text-muted-foreground">
            <span>
              Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, total)} Of{" "}
              {total.toLocaleString()}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Previous
              </Button>
              <span>
                Page {page + 1} Of {pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full"
                disabled={page + 1 >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Manual blacklist — first-class, single or bulk, with a note      */
/* ------------------------------------------------------------------ */
export function BlacklistDialog({
  workspaceId,
  variant = "compact",
}: {
  workspaceId: string | null | undefined;
  variant?: "compact" | "prominent";
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [note, setNote] = useState("");
  const qc = useQueryClient();
  const run = useServerFn(importSuppression);

  const mutation = useMutation({
    mutationFn: (phones: string[]) =>
      run({
        data: {
          workspaceId: workspaceId!,
          phones,
          reason: "manual",
          source: "blacklist",
          ...(note.trim() ? { note: note.trim() } : {}),
        },
      }),
    onSuccess: (res) => {
      toast.success(
        `Blacklisted ${res.imported} Number${res.imported === 1 ? "" : "s"} — Reason: Manual.`,
      );
      setText("");
      setNote("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["suppression-list"] });
      qc.invalidateQueries({ queryKey: ["compliance-state", workspaceId] });
    },
    onError: () => toast.error("Could Not Add To Blacklist. Check The Numbers And Try Again."),
  });

  function submit() {
    const phones = text.split(/[\s,;]+/).filter(Boolean);
    if (phones.length === 0) {
      toast.error("Add At Least One Phone Number.");
      return;
    }
    mutation.mutate(phones);
  }

  async function onFile(file: File) {
    const phones = parseCsv(await file.text())
      .flat()
      .filter((v) => v.replace(/\D/g, "").length >= 10);
    if (phones.length === 0) {
      toast.error("No Phone Numbers Found In That File.");
      return;
    }
    mutation.mutate(phones);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "prominent" ? (
          <Button className="rounded-full" disabled={!workspaceId}>
            <Ban className="mr-1.5 h-4 w-4" /> Add To Blacklist
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="h-9 rounded-full" disabled={!workspaceId}>
            <Ban className="mr-1 h-3.5 w-3.5" /> Add To Blacklist
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add To Blacklist</DialogTitle>
          <DialogDescription>
            Anything Added Here Is Suppressed Across Every Campaign With Reason "Manual" —
            The Same List The Inbox Blacklist Button Writes To.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Paste One Phone Number Or Many — One Per Line Or Comma Separated"
          />
          <Input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional Note — Why Is This Number Blacklisted?"
          />
          <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-primary hover:underline">
            <Upload className="h-3.5 w-3.5" /> Upload CSV Instead
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </label>
        </div>
        <DialogFooter>
          <Button className="rounded-full" onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending ? "Adding…" : "Add To Blacklist"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* 2. Per-person compliance lookup                                     */
/* ------------------------------------------------------------------ */
export function ContactLookup({ workspaceId }: { workspaceId: string | null | undefined }) {
  const [input, setInput] = useState("");
  const [phone, setPhone] = useState("");
  const run = useServerFn(lookupContact);

  const { data, isFetching } = useQuery({
    queryKey: ["contact-lookup", workspaceId, phone],
    queryFn: () => run({ data: { workspaceId: workspaceId!, phone } }),
    enabled: !!workspaceId && phone.replace(/\D/g, "").length >= 7,
  });

  function exportTimeline() {
    if (!data) return;
    const rows: Array<Record<string, unknown>> = [
      ...(data.suppression
        ? [
            {
              timestamp: new Date(data.suppression.created_at).toISOString(),
              event: "Suppressed",
              detail: `${REASON_LABEL[data.suppression.bucket] ?? data.suppression.reason} (${data.suppression.source})`,
              actor: "System",
              note: data.suppression.note ?? "",
            },
          ]
        : []),
      ...data.messages.map((m) => ({
        timestamp: new Date(m.created_at).toISOString(),
        event: m.direction === "inbound" ? "Inbound Message" : `Outbound Message (${m.status ?? "unknown"})`,
        detail: m.body ?? "",
        actor: m.direction === "inbound" ? "Contact" : m.is_bot ? "AI Agent" : "Human",
        note: m.error_code ?? "",
      })),
      ...data.blocks.map((b) => ({
        timestamp: new Date(b.created_at).toISOString(),
        event: "Send Blocked",
        detail: `${b.reason} via ${PATH_LABEL[b.path] ?? b.path}`,
        actor: "System",
        note: b.source,
      })),
    ].sort((a, b) => String(b["timestamp"]).localeCompare(String(a["timestamp"])));

    if (rows.length === 0) {
      toast.error("Nothing To Export For That Number.");
      return;
    }
    downloadCsv(`compliance-timeline-${data.phone.replace(/\D/g, "")}-${stamp()}.csv`, toCsv(rows));
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-base font-display">Look Up A Contact</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            One Timeline For One Person — Suppression Status, Every Message, Every Refused Send.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form
            className="relative"
            onSubmit={(e) => {
              e.preventDefault();
              setPhone(input.trim());
            }}
          >
            <User className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter Phone Number"
              className="h-9 w-56 rounded-full pl-8"
            />
          </form>
          <Button
            size="sm"
            className="h-9 rounded-full"
            onClick={() => setPhone(input.trim())}
            disabled={input.replace(/\D/g, "").length < 7}
          >
            <Search className="mr-1 h-3.5 w-3.5" /> Look Up
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 rounded-full"
            onClick={exportTimeline}
            disabled={!data?.found}
          >
            <Download className="mr-1 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!phone && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Enter A Phone Number To Pull Its Full Compliance Record.
          </div>
        )}
        {phone && isFetching && (
          <div className="p-6 text-center text-sm text-muted-foreground">Pulling Record…</div>
        )}
        {phone && !isFetching && data && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-muted p-4">
              <div className="font-display text-lg font-bold text-foreground">{data.phone}</div>
              {data.lead?.name && <span className="text-sm text-muted-foreground">{data.lead.name}</span>}
              {data.suppression ? (
                <Badge variant="outline" className="gap-1 border-danger/30 text-danger">
                  <ShieldOff className="h-3.5 w-3.5" /> Suppressed —{" "}
                  {REASON_LABEL[data.suppression.bucket] ?? data.suppression.reason} Since{" "}
                  {fmtDate(data.suppression.created_at)}
                </Badge>
              ) : (
                <Badge variant="outline" className="border-success/30 text-success">
                  Not Suppressed
                </Badge>
              )}
              {data.suppression?.note && (
                <span className="text-xs text-muted-foreground">Note: {data.suppression.note}</span>
              )}
            </div>

            {!data.found && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                No Record Of This Number In This Workspace.
              </div>
            )}

            {data.blocks.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Refused Sends ({data.blocks.length})
                </div>
                <div className="space-y-2">
                  {data.blocks.map((b) => (
                    <div
                      key={b.id}
                      className="flex flex-wrap items-center gap-2 rounded-xl border border-warn/30 bg-warn/5 p-3 text-sm"
                    >
                      <CircleSlash className="h-3.5 w-3.5 text-warn" />
                      <span className="font-medium text-foreground">{PATH_LABEL[b.path] ?? b.path}</span>
                      <span className="text-muted-foreground">Blocked — {b.reason}</span>
                      <span className="ml-auto text-xs text-muted-foreground">{fmtDate(b.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.messages.length > 0 && (
              <div>
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Message History ({data.messages.length})
                </div>
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {data.messages.map((m) => (
                    <div key={m.id} className="rounded-xl border border-border p-3 text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        {m.direction === "inbound" ? (
                          <ArrowDownLeft className="h-3.5 w-3.5 text-primary" />
                        ) : (
                          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="font-medium text-foreground">
                          {m.direction === "inbound" ? "Inbound" : "Outbound"}
                        </span>
                        <Badge variant="outline" className="text-muted-foreground">
                          {m.status ?? "unknown"}
                        </Badge>
                        {m.direction === "outbound" && (
                          <Badge
                            variant="outline"
                            className={m.is_bot ? "gap-1 border-primary/30 text-primary" : "text-muted-foreground"}
                          >
                            {m.is_bot ? <Bot className="h-3 w-3" /> : null}
                            {m.is_bot ? "AI Agent" : "Human"}
                          </Badge>
                        )}
                        {m.is_optout && (
                          <Badge variant="outline" className="border-danger/30 text-danger">
                            Opt-Out
                          </Badge>
                        )}
                        <span className="ml-auto text-xs text-muted-foreground">{fmtDate(m.created_at)}</span>
                      </div>
                      {m.body && <div className="mt-1.5 text-muted-foreground">{m.body}</div>}
                      {m.error_code && (
                        <div className="mt-1 text-xs text-danger">Error: {m.error_code}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Blocked-attempt log                                              */
/* ------------------------------------------------------------------ */
export function BlockedAttemptsLog({ workspaceId }: { workspaceId: string | null | undefined }) {
  const [path, setPath] = useState("all");
  const [days, setDays] = useState("0");
  const [query, setQuery] = useState("");
  const run = useServerFn(listBlockedAttempts);

  const { data, isLoading } = useQuery({
    queryKey: ["blocked-attempts", workspaceId, path, days, query],
    queryFn: () =>
      run({ data: { workspaceId: workspaceId!, path, days: Number(days), query, limit: 500 } }),
    enabled: !!workspaceId,
  });

  const rows = data?.rows ?? [];

  function exportLog() {
    if (rows.length === 0) {
      toast.error("Nothing To Export For That Range.");
      return;
    }
    downloadCsv(
      `blocked-sends-${stamp()}.csv`,
      toCsv(
        rows.map((r) => ({
          timestamp: new Date(r.created_at).toISOString(),
          phone: r.phone ?? "",
          reason: r.reason,
          path: PATH_LABEL[r.path] ?? r.path,
          source: r.source,
          lead_id: r.lead_id ?? "",
        })),
      ),
    );
  }

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-base font-display">Blocked Send Attempts</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Every Time We Refused To Text Someone — Logged With Path,
            <br />
            Reason & Timestamp.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Phone Number"
              className="h-9 w-48 rounded-full pl-8"
            />
          </div>
          <Select value={path} onValueChange={setPath}>
            <SelectTrigger className="h-9 w-[150px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Paths</SelectItem>
              <SelectItem value="manual">Manual Send</SelectItem>
              <SelectItem value="campaign">Campaign</SelectItem>
              <SelectItem value="bot">AI Agent</SelectItem>
              <SelectItem value="cadence">Cadence</SelectItem>
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-9 w-[150px] rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">All Time</SelectItem>
              <SelectItem value="7">Last 7 Days</SelectItem>
              <SelectItem value="30">Last 30 Days</SelectItem>
              <SelectItem value="90">Last 90 Days</SelectItem>
              <SelectItem value="365">Last 12 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="h-9 rounded-full"
            onClick={exportLog}
            disabled={rows.length === 0}
          >
            <Download className="mr-1 h-3.5 w-3.5" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="p-4">Date</th>
              <th className="p-4">Phone</th>
              <th className="p-4">Path</th>
              <th className="p-4">Reason</th>
              <th className="p-4">Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="p-4 text-muted-foreground">{fmtDate(r.created_at)}</td>
                <td className="p-4 font-medium text-foreground">{r.phone ?? "—"}</td>
                <td className="p-4">
                  <Badge variant="outline" className="text-muted-foreground">
                    {PATH_LABEL[r.path] ?? r.path}
                  </Badge>
                </td>
                <td className="p-4 text-warn">{r.reason}</td>
                <td className="p-4 text-muted-foreground">{r.source}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-muted-foreground">
                  {isLoading
                    ? "Loading Blocked Attempts…"
                    : "No Blocked Send Attempts In This Range — Nothing Was Refused."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
