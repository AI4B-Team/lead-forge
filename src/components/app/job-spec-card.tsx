import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDUSTRIES, RECORD_TYPES, COUNTIES } from "@/lib/mock-data";
import type { Coverage, JobSpec } from "@/lib/assistant.shared";
import { CountyMultiSelect } from "@/components/app/county-multi-select";
import { US_STATES, countiesForState } from "@/lib/us-geo";

const COVERAGE_STYLE: Record<Coverage, string> = {
  live: "border-success/40 text-success",
  beta: "border-warning/40 text-warning",
  requested: "border-border text-muted-foreground",
  unknown: "border-border text-muted-foreground",
};

const COVERAGE_LABEL: Record<Coverage, string> = {
  live: "Live",
  beta: "Beta",
  requested: "Requested",
  unknown: "Not Covered",
};

/** Small inline confidence badge shown next to fields the assistant filled in. */
function Confidence({ value, show }: { value: number; show: boolean }) {
  if (!show) return null;
  return (
    <span className="rounded-full bg-success/12 px-1.5 py-0.5 text-[10px] font-semibold text-success">
      {value}%
    </span>
  );
}

function FieldLabel({ children, confidence, show }: { children: React.ReactNode; confidence?: number; show?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <Label>{children}</Label>
      {confidence ? <Confidence value={confidence} show={Boolean(show)} /> : null}
    </div>
  );
}

/**
 * Text fields commit on blur or after an 800ms typing pause — whichever comes
 * first — so a multi-word entry produces one spec edit, not one per keystroke.
 */
function useCommitDraft(value: string, onCommit: (v: string) => void) {
  const [draft, setDraft] = useState(value);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!dirty.current) setDraft(value);
  }, [value]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const fire = (v: string) => {
    dirty.current = false;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    onCommit(v);
  };

  return {
    value: draft,
    onChange: (v: string) => {
      setDraft(v);
      dirty.current = true;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => fire(v), 800);
    },
    onBlur: () => { if (dirty.current) fire(draft); },
  };
}

function CommitInput({
  value,
  onCommit,
  className,
  placeholder,
}: { value: string; onCommit: (v: string) => void; className?: string; placeholder?: string }) {
  const d = useCommitDraft(value, onCommit);
  return (
    <Input
      className={className}
      value={d.value}
      placeholder={placeholder}
      onChange={(e) => d.onChange(e.target.value)}
      onBlur={d.onBlur}
    />
  );
}

function CommitTextarea({
  value,
  onCommit,
  className,
  placeholder,
  rows,
}: { value: string; onCommit: (v: string) => void; className?: string; placeholder?: string; rows?: number }) {
  const d = useCommitDraft(value, onCommit);
  return (
    <Textarea
      className={className}
      rows={rows}
      value={d.value}
      placeholder={placeholder}
      onChange={(e) => d.onChange(e.target.value)}
      onBlur={d.onBlur}
    />
  );
}

/**
 * The single editable List Settings panel (§22). It is schema-aware: fields that
 * don't apply to the chosen source type never render.
 */
export function JobSpecCard({
  spec,
  onChange,
  coverage,
  inferred,
}: {
  spec: JobSpec;
  onChange: (next: JobSpec) => void;
  coverage: Array<{ county: string; coverage: Coverage }>;
  /** Fields the assistant inferred in this conversation — only these get a % badge. */
  inferred?: Set<keyof JobSpec>;
}) {
  const set = <K extends keyof JobSpec>(key: K, value: JobSpec[K]) => onChange({ ...spec, [key]: value });
  const inf = (key: keyof JobSpec) => Boolean(inferred?.has(key));
  const covFor = (county: string): Coverage =>
    coverage.find((c) => c.county.toLowerCase() === county.toLowerCase())?.coverage ?? "unknown";

  const isRecords = spec.sourceType === "records";
  const isBusiness = spec.sourceType === "business";
  const isUpload = spec.sourceType === "upload";
  const hasGeo = isRecords || isBusiness;

  const toggles = isUpload
    ? ([
        ["skipTrace", "Skip Trace Missing Numbers"],
        ["dedupe", "Dedupe Against Past Lists"],
        ["mobileOnly", "Mobile Numbers Only"],
      ] as const)
    : isRecords
      ? ([
          ["skipTrace", "Skip Trace Missing Numbers"],
          ["dedupe", "Dedupe Against Past Lists"],
          ["mobileOnly", "Mobile Numbers Only"],
        ] as const)
      : ([
          ["skipTrace", "Skip Trace Missing Numbers"],
          ["removeFranchises", "Remove Franchises"],
          ["dedupe", "Dedupe Against Past Lists"],
          ["mobileOnly", "Mobile Numbers Only"],
        ] as const);

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="font-display font-bold text-foreground">List Settings</div>
          <Badge variant="outline" className="text-[10px] uppercase">Editable</Badge>
        </div>

        <div>
          <FieldLabel confidence={99} show={Boolean(spec.sourceType) && inf("sourceType")}>Source</FieldLabel>
          <Select
            value={spec.sourceType ?? ""}
            onValueChange={(v) => set("sourceType", v as JobSpec["sourceType"])}
          >
            <SelectTrigger className="mt-1"><SelectValue placeholder="Not Chosen Yet" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="business">Business Scrape</SelectItem>
              <SelectItem value="records">Public Records</SelectItem>
              <SelectItem value="upload">Upload My List</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isRecords && (
          <div>
            <FieldLabel confidence={96} show={Boolean(spec.recordType) && inf("recordType")}>Record Type</FieldLabel>
            <Select value={spec.recordType ?? ""} onValueChange={(v) => set("recordType", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pick A Record Type" /></SelectTrigger>
              <SelectContent>
                {RECORD_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}

        {isBusiness && (
          <div>
            <FieldLabel confidence={97} show={spec.niches.length > 0 && inf("niches")}>Niches</FieldLabel>
            <CommitInput
              className="mt-1"
              value={spec.niches.join(", ")}
              onCommit={(v) =>
                set("niches", v.split(",").map((s) => s.trim()).filter(Boolean))
              }
              placeholder="e.g. HVAC, Roofer"
            />
          </div>
        )}

        {isUpload && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Your Own File</span>
            <div className="mt-1">
              Upload Jobs Start On The Upload Page, Where You Attach The File And Map Its Columns. The Cleaning,
              Line-Type Check, And Scrub Run Exactly The Same.
            </div>
          </div>
        )}

        {hasGeo && (
          <>
            <div className={isRecords ? "grid grid-cols-2 gap-3" : ""}>
              <div>
                <FieldLabel confidence={95} show={Boolean(spec.state) && inf("state")}>State</FieldLabel>
                <Select
                  value={spec.state ?? ""}
                  onValueChange={(v) =>
                    onChange({ ...spec, state: v, counties: spec.state === v ? spec.counties : [] })
                  }
                >
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pick A State" /></SelectTrigger>
                  <SelectContent className="max-h-72">
                    {US_STATES.map((s) => (
                      <SelectItem key={s.code} value={s.code}>{s.code} · {s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isRecords && (
                <div>
                  <Label>Recency (Days)</Label>
                  <CommitInput
                    className="mt-1"
                    value={spec.recencyDays ? String(spec.recencyDays) : ""}
                    onCommit={(v) => {
                      const n = Number(v.replace(/\D/g, ""));
                      set("recencyDays", n ? n : null);
                    }}
                    placeholder="90"
                  />
                </div>
              )}
            </div>

            <div>
              <FieldLabel confidence={98} show={spec.counties.length > 0 && inf("counties")}>Counties</FieldLabel>
              <CountyMultiSelect
                state={spec.state}
                value={spec.counties}
                onChange={(next) => set("counties", next)}
                renderBadgeClassName={(c) => COVERAGE_STYLE[covFor(c)]}
                renderBadgeLabel={(c) => `${c} · ${COVERAGE_LABEL[covFor(c)]}`}
              />
              {!spec.counties.length && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {spec.state
                    ? `Select One Or More Of The ${countiesForState(spec.state).length} Counties In ${spec.state}. Leave Empty To Cover The Whole State.`
                    : `Covered Now: ${COUNTIES.filter((c) => c.coverage === "live").map((c) => c.name).join(", ")}`}
                </p>
              )}
            </div>
          </>
        )}

        <div>
          <Label>Industry Preset</Label>
          <Select value={spec.industry ?? ""} onValueChange={(v) => set("industry", v)}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Suggested By The Assistant" /></SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((i) => <SelectItem key={i.key} value={i.key}>{i.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>First-Touch Angle</Label>
          <CommitTextarea
            className="mt-1"
            rows={3}
            value={spec.messageAngle ?? ""}
            onCommit={(v) => set("messageAngle", v || null)}
            placeholder="Empathetic, low-pressure opener…"
          />
        </div>

        <div className="space-y-3">
          {toggles.map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{label}</span>
              <Switch checked={spec[key]} onCheckedChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
