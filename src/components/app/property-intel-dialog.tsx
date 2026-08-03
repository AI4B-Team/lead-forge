// Realeflow property intelligence dialog — full property record + comps,
// including the mandatory MLS attribution (per Realeflow's Tyler Snyder:
// when status_info.source === "MLS" the full mls_disclaimer +
// mls_listing_source MUST be visibly rendered wherever MLS data is shown).
// Data flows through server functions, the API key never reaches the browser.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { realeflowComps, realeflowDetails } from "@/lib/realeflow.functions";
import type { CompsResponse, DetailsResponse, StatusInfo } from "@/lib/realeflow/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Loader2 } from "lucide-react";

// ── formatting helpers ─────────────────────────────────────────────────────
// The API returns some numeric fields as strings (e.g. year_built: "1992").

function toNum(v: unknown): number | null {
  if (typeof v === "number") return Number.isNaN(v) ? null : v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function fmtMoney(v: unknown): string {
  const n = toNum(v);
  if (n === null) return "—";
  return "$" + Math.round(n).toLocaleString();
}

export function fmtNum(v: unknown): string {
  const n = toNum(v);
  if (n === null || n === 0) return "—";
  return n.toLocaleString();
}

function str(v: unknown): string {
  return typeof v === "string" && v.trim() ? v.trim() : "";
}

export function compAddress(p: Record<string, unknown>): string {
  const line = [str(p.address_number), str(p.address_street)].filter(Boolean).join(" ");
  return line || "—";
}

// ── MLS compliance ─────────────────────────────────────────────────────────

export function MlsAttribution({ statusInfo }: { statusInfo?: StatusInfo | null }) {
  if (!statusInfo || statusInfo.source !== "MLS") return null;
  const source = str(statusInfo.mls_listing_source);
  const disclaimer = str(statusInfo.mls_disclaimer);
  if (!source && !disclaimer) return null;
  return (
    <div className="border-t pt-2 mt-2 space-y-1">
      {source && <p className="text-[11px] text-muted-foreground">Listing courtesy of {source}</p>}
      {disclaimer && (
        <p className="text-[10px] leading-snug text-muted-foreground whitespace-pre-wrap">{disclaimer}</p>
      )}
    </div>
  );
}

function MlsAttributionList({ infos }: { infos: (StatusInfo | undefined | null)[] }) {
  const seen = new Set<string>();
  const unique: StatusInfo[] = [];
  for (const info of infos) {
    if (!info || info.source !== "MLS") continue;
    const key = `${str(info.mls_listing_source)}|${str(info.mls_disclaimer)}`;
    if (key === "|" || seen.has(key)) continue;
    seen.add(key);
    unique.push(info);
  }
  if (unique.length === 0) return null;
  return (
    <div>
      {unique.map((info, i) => (
        <MlsAttribution key={i} statusInfo={info} />
      ))}
    </div>
  );
}

// ── dialog ─────────────────────────────────────────────────────────────────

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium truncate">{value ?? "—"}</div>
    </div>
  );
}

function sectionCount(
  d: DetailsResponse,
  key: "history" | "parcel" | "liens" | "preforeclosures",
): number | null {
  const section = d[key] as { data?: unknown[] } | undefined;
  if (!section || !Array.isArray(section.data)) return null;
  return section.data.length;
}

export function PropertyIntelDialog({
  hash,
  title,
  open,
  onOpenChange,
}: {
  hash: string | null;
  title?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const getDetails = useServerFn(realeflowDetails);
  const getComps = useServerFn(realeflowComps);
  const [tab, setTab] = useState<"overview" | "comps">("overview");

  const details = useQuery({
    queryKey: ["rf-details", hash],
    enabled: open && !!hash,
    staleTime: 5 * 60 * 1000,
    queryFn: () =>
      getDetails({
        data: { identifier: hash!, with: ["history", "parcel", "preforeclosures", "liens"] },
      }),
  });

  const comps = useQuery({
    queryKey: ["rf-comps", hash],
    enabled: open && !!hash && tab === "comps",
    staleTime: 5 * 60 * 1000,
    queryFn: () => getComps({ data: { identifier: hash!, limit: 12, distance: 2 } }),
  });

  const d = details.data as DetailsResponse | undefined;
  const c = comps.data as CompsResponse | undefined;
  const statusInfo = d?.status_info as StatusInfo | undefined;
  const statusLabel = statusInfo ? str(statusInfo.statusLabel) : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setTab("overview");
      }}
    >
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {title || "Property Intel"}
          </DialogTitle>
          <DialogDescription>Data From Realeflow Property Data API</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 border-b">
          {(["overview", "comps"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "overview" ? "Overview" : `Comps${c ? ` (${c.count_comps})` : ""}`}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="space-y-4">
            {details.isLoading && <LoadingRow label="Loading Property Record…" />}
            {details.isError && (
              <p className="text-sm text-destructive">
                {(details.error as Error)?.message || "Failed to load property details"}
              </p>
            )}
            {d && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Stat label="Owner" value={str(d.owner_std_name1_full) || "—"} />
                  <Stat label="Est. Value" value={fmtMoney(d.property_value)} />
                  <Stat
                    label="Est. Equity ($)"
                    value={(() => {
                      const v = toNum(d.property_value);
                      const mtg = toNum(d.estimated_mortgage_balance) ?? 0;
                      return v !== null ? fmtMoney(v - mtg) : "—";
                    })()}
                  />
                  <Stat label="Est. Mortgage Balance" value={fmtMoney(d.estimated_mortgage_balance)} />
                  <Stat label="Years Owned" value={fmtNum(d.length_of_ownership)} />
                  <Stat label="Year Built" value={fmtNum(d.year_built)} />
                  <Stat label="Beds" value={fmtNum(d.bedrooms)} />
                  <Stat label="Baths" value={fmtNum(d.bath_total_calc)} />
                  <Stat label="Building Sq Ft" value={fmtNum(d.building_area)} />
                </div>

                {statusLabel && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Listing Status: </span>
                    <span className="font-medium">{statusLabel}</span>
                    <MlsAttribution statusInfo={statusInfo} />
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  {(
                    [
                      ["history", "Sale History"],
                      ["parcel", "Parcel Records"],
                      ["liens", "Liens"],
                      ["preforeclosures", "Pre-Foreclosures"],
                    ] as const
                  ).map(([key, label]) => {
                    const n = sectionCount(d, key);
                    return (
                      <div key={key} className="rounded-md border px-3 py-2">
                        <div className="text-muted-foreground">{label}</div>
                        <div className="font-medium">
                          {n === null
                            ? key === "liens" || key === "preforeclosures"
                              ? "None On Record"
                              : "—"
                            : `${n} Record${n === 1 ? "" : "s"}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "comps" && (
          <div className="space-y-3">
            {comps.isLoading && <LoadingRow label="Finding Comparable Properties…" />}
            {comps.isError && (
              <p className="text-sm text-destructive">
                {(comps.error as Error)?.message || "Failed to load comps"}
              </p>
            )}
            {c && (
              <>
                <p className="text-sm text-muted-foreground">
                  {c.count_comps} Comps Within 2 Miles · Sources: {c.comp_sources.join(", ")}
                </p>
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="text-left px-3 py-2">Address</th>
                        <th className="text-left px-3 py-2">Dist (mi)</th>
                        <th className="text-left px-3 py-2">Beds</th>
                        <th className="text-left px-3 py-2">Baths</th>
                        <th className="text-left px-3 py-2">Sq Ft</th>
                        <th className="text-left px-3 py-2">Est. Value</th>
                        <th className="text-left px-3 py-2">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.comps.map((comp, i) => {
                        const p = comp.property as Record<string, unknown>;
                        return (
                          <tr key={i} className="border-t">
                            <td className="px-3 py-2">
                              {compAddress(p)}
                              <span className="text-muted-foreground text-xs">
                                {" "}
                                {str(p.address_city)} {str(p.address_zip)}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-mono text-xs">{comp.distance.toFixed(2)}</td>
                            <td className="px-3 py-2">{fmtNum(p.bedrooms)}</td>
                            <td className="px-3 py-2">{fmtNum(p.bath_total_calc)}</td>
                            <td className="px-3 py-2">{fmtNum(p.building_area)}</td>
                            <td className="px-3 py-2">{fmtMoney(p.property_value)}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {comp.record_type === "MLS_LISTING" ? "MLS" : "Public Record"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <MlsAttributionList
                  infos={c.comps.map((comp) => (comp.property as { status_info?: StatusInfo }).status_info)}
                />
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function LoadingRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}
