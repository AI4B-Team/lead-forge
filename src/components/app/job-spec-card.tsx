import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INDUSTRIES, RECORD_TYPES, COUNTIES } from "@/lib/mock-data";
import { specStates, withStates, type Coverage, type JobSpec } from "@/lib/assistant.shared";
import { CountyMultiSelect } from "@/components/app/county-multi-select";
import { StateMultiSelect } from "@/components/app/state-multi-select";
import { countiesForState, parseCounty } from "@/lib/us-geo";
import { UploadCloud, X, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  attachmentMappedCount, isSpreadsheet, type UploadAttachment,
} from "@/lib/upload-attachment";

/**
 * Inline dropzone + mapping summary. Uploads never leave the assistant page.
 */
function UploadPanel({
  upload,
  onPickFile,
  onRemove,
  onEditMapping,
}: {
  upload: UploadAttachment | null;
  onPickFile: (file: File) => void;
  onRemove: () => void;
  onEditMapping: () => void;
}) {
  const take = (file: File | null | undefined) => {
    if (file && isSpreadsheet(file)) onPickFile(file);
  };

  if (upload) {
    return (
      <div className="rounded-xl border border-border bg-surface p-3">
        <div className="flex items-start gap-2">
          <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium text-foreground">{upload.name}</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              {upload.parseable
                ? `${upload.rowCount.toLocaleString()} Rows · ${attachmentMappedCount(upload)} Columns Mapped${upload.mapped ? " ✓" : ""}`
                : `${(upload.size / 1024).toFixed(1)} KB · Columns Mapped After Upload`}
            </div>
            {upload.parseable && (
              <button
                type="button"
                onClick={onEditMapping}
                className="mt-1 text-xs font-medium text-primary hover:underline"
              >
                {upload.mapped ? "Edit Mapping" : "Map Columns"}
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove File"
            className="h-6 w-6 rounded-full"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <label
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); take(e.dataTransfer.files?.[0]); }}
      className="block cursor-pointer rounded-xl border-2 border-dashed border-border bg-surface-muted p-5 text-center transition hover:border-primary"
    >
      <UploadCloud className="mx-auto h-6 w-6 text-muted-foreground" />
      <div className="mt-2 text-sm font-medium text-foreground">Drop Your File Here</div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        CSV Or XLSX · Up To 25,000 Rows
      </div>
      <input
        type="file"
        className="hidden"
        accept=".csv,.xlsx"
        onChange={(e) => take(e.target.files?.[0])}
      />
    </label>
  );
}

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
  upload = null,
  onPickFile,
  onRemoveUpload,
  onEditMapping,
}: {
  spec: JobSpec;
  onChange: (next: JobSpec) => void;
  coverage: Array<{ county: string; coverage: Coverage }>;
  /** Fields the assistant inferred in this conversation — only these get a % badge. */
  inferred?: Set<keyof JobSpec>;
  upload?: UploadAttachment | null;
  onPickFile?: (file: File) => void;
  onRemoveUpload?: () => void;
  onEditMapping?: () => void;
}) {
  const set = <K extends keyof JobSpec>(key: K, value: JobSpec[K]) => onChange({ ...spec, [key]: value });
  const inf = (key: keyof JobSpec) => Boolean(inferred?.has(key));
  const covFor = (county: string): Coverage =>
    coverage.find((c) => c.county.toLowerCase() === county.toLowerCase())?.coverage ?? "unknown";

  const isRecords = spec.sourceType === "records";
  const isBusiness = spec.sourceType === "business";
  const isUpload = spec.sourceType === "upload";
  const hasGeo = isRecords || isBusiness;
  const states = specStates(spec);

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
            onValueChange={(v) => {
              const sourceType = v as JobSpec["sourceType"];
              // Franchise removal only exists for business sources — drop it on switch.
              onChange({
                ...spec,
                sourceType,
                removeFranchises: sourceType === "business" ? spec.removeFranchises : false,
              });
            }}
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
          <div className="space-y-2">
            <Label>Your Own File</Label>
            <UploadPanel
              upload={upload}
              onPickFile={(f) => onPickFile?.(f)}
              onRemove={() => onRemoveUpload?.()}
              onEditMapping={() => onEditMapping?.()}
            />
            <p className="text-[11px] text-muted-foreground">
              The Cleaning, Line-Type Check, And Scrub Run Exactly The Same.
            </p>
          </div>
        )}

        {!isUpload && upload && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{upload.name}</span>
            <div className="mt-1">File Saved — Switch Back To Upload My List To Use It.</div>
          </div>
        )}

        {hasGeo && (
          <>
            <div className={isRecords ? "grid grid-cols-2 gap-3" : ""}>
              <div>
                <FieldLabel confidence={95} show={states.length > 0 && inf("state")}>
                  {states.length > 1 ? "States" : "State"}
                </FieldLabel>
                <StateMultiSelect
                  value={states}
                  onChange={(next) => {
                    const keep = new Set(next.map((s) => s.toUpperCase()));
                    onChange({
                      ...withStates(spec, next),
                      // Drop counties whose state is no longer selected.
                      counties: spec.counties.filter((c) => {
                        const st = parseCounty(c).state;
                        return st ? keep.has(st) : false;
                      }),
                    });
                  }}
                />
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
                states={states}
                value={spec.counties}
                onChange={(next) => set("counties", next)}
                renderBadgeClassName={(c) => COVERAGE_STYLE[covFor(c)]}
                renderBadgeLabel={(c) => `${c} · ${COVERAGE_LABEL[covFor(c)]}`}
              />
              {!spec.counties.length && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {states.length
                    ? `Select One Or More Of The ${states.reduce((n, s) => n + countiesForState(s).length, 0)} Counties In ${states.join(", ")}. Leave Empty To Cover ${states.length > 1 ? "Every Selected State" : "The Whole State"}.`
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
