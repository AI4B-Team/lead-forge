import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpHint } from "@/components/app/help-hint";
import { coverageForCounty } from "@/lib/reference-data.shared";
import { useReferenceData } from "@/hooks/use-reference-data";
import { RECORD_TYPE_OPTIONS, REQUEST_RECORD_TYPE } from "@/lib/record-types";
import { specStates, withStates, type Coverage, type JobSpec } from "@/lib/assistant.shared";
import { CountyMultiSelect } from "@/components/app/county-multi-select";
import { StateMultiSelect } from "@/components/app/state-multi-select";
import { countiesForState, parseCounty } from "@/lib/us-geo";
import { UploadCloud, X, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  attachmentMappedCount, isSpreadsheet, type UploadAttachment,
} from "@/lib/upload-attachment";
import { optionsForSource, specOptionContext, defaultCountryFor, isDataSource, isNonUsRun } from "@/lib/pipeline-options";
import { TemplateLogo } from "@/components/marketing/template-logo";
import { BuyBoxFields } from "@/components/app/buy-box-fields";
import {
  channelOptions, inferChannel, CHANNEL_LABEL, CHANNEL_HINT, type Channel,
} from "@/lib/channels";
import type { Template } from "@/lib/templates";
import {
  templateAdapterStatus, templateFieldSchema, fieldsForSourceType, filterFieldLabel,
  dedupesByCompany, type BuilderField,
} from "@/lib/template-schema";

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

/** Panel opened via ?source= with no template selected yet. */
const SOURCE_FALLBACK_LABEL: Record<string, string> = {
  business: "Business Search",
  records: "Public Records",
  upload: "Upload My List",
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

function FieldLabel({
  children,
  confidence,
  show,
  hint,
  hintTitle,
}: {
  children: React.ReactNode;
  confidence?: number;
  show?: boolean;
  hint?: string;
  hintTitle?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Label>{children}</Label>
      {hint ? <HelpHint title={hintTitle ?? (typeof children === "string" ? children : "This Field")}>{hint}</HelpHint> : null}
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

/**
 * The List Builder panel. It renders from the selected template's field schema,
 * so each source asks only for what it actually needs.
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
  onClearTargets,
  onRequestRecordType,
  template = null,
  onChangeTemplate,
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
  /** Drops an uploaded parameter file so the source runs on its own settings. */
  onClearTargets?: () => void;
  /** Logs a record type the pipeline does not support yet. */
  onRequestRecordType?: (request: string) => Promise<void> | void;
  /** The selected source template — the panel's Source row and field schema. */
  template?: Template | null;
  /** Opens the shared All Templates modal (the one source browser). */
  onChangeTemplate?: () => void;
}) {
  const set = <K extends keyof JobSpec>(key: K, value: JobSpec[K]) => onChange({ ...spec, [key]: value });
  const inf = (key: keyof JobSpec) => Boolean(inferred?.has(key));
  const { countyCoverage } = useReferenceData();
  // Business / local scrapes have no geo whitelist, so fall back to the
  // source-aware verdict instead of assuming "Not Covered".
  const covFor = (county: string): Coverage =>
    coverage.find((c) => c.county.toLowerCase() === county.toLowerCase())?.coverage ??
    coverageForCounty(countyCoverage, county, spec.sourceType);

  const fields: BuilderField[] = template ? templateFieldSchema(template) : fieldsForSourceType(spec.sourceType);
  const has = (f: BuilderField) => fields.includes(f);
  const isUpload = has("upload");
  const isRecords = has("recordType");
  const isScan = spec.sourceType === "street_scan";
  // Street Scan resolves geography through the combined Location search that
  // renders first, so it never shows the separate State + Counties block.
  const hasGeo = (has("state") || has("counties")) && !isScan;
  const dataOnly = isDataSource(spec.templateId);
  const nonUs = isNonUsRun({ templateId: spec.templateId, country: spec.country });
  const filterLabel = filterFieldLabel(spec.templateId);
  const status = template ? templateAdapterStatus(template) : "live";
  const states = specStates(spec);
  const [requestOpen, setRequestOpen] = useState(false);
  const [requestText, setRequestText] = useState("");
  const [requesting, setRequesting] = useState(false);

  const submitRecordTypeRequest = async () => {
    const text = requestText.trim();
    if (!text || !onRequestRecordType) return;
    setRequesting(true);
    try {
      await onRequestRecordType(text);
      setRequestText("");
      setRequestOpen(false);
    } finally {
      setRequesting(false);
    }
  };

  // Labels and ordering come from the shared config the checklist also uses.
  const toggles = optionsForSource(spec.sourceType, spec.templateId, specOptionContext(spec));

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <div className="font-display font-bold text-foreground">List Builder</div>

        {/* Source is a template picker row — the same selection as a template card. */}
        <div>
          <FieldLabel
            confidence={99}
            show={Boolean(spec.sourceType) && inf("sourceType")}
            hint="Where the leads come from — a business directory, a public records feed, a social platform, or your own uploaded file. Each source asks for slightly different details."
          >
            Source
          </FieldLabel>
          <div className="mt-1 flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            {template ? (
              <TemplateLogo template={template} className="h-9 w-9 rounded-lg" imgClassName="h-5 w-5" iconClassName="h-4 w-4" />
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-dashed border-border text-muted-foreground">
                <UploadCloud className="h-4 w-4" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {template?.title ?? SOURCE_FALLBACK_LABEL[spec.sourceType ?? ""] ?? "Pick A Source"}
              </div>
              <div className="truncate text-[11px] text-muted-foreground">
                {template?.subtitle ?? "Choose From Every Source Template"}
              </div>
            </div>
            <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={() => onChangeTemplate?.()}>
              {template || spec.sourceType ? "Change" : "Browse"}
            </Button>
          </div>
          {template && status !== "live" && (
            <div className="mt-2 flex items-center gap-2 text-[11px] text-warning">
              <Badge variant="outline" className="border-warning/40 text-[10px] uppercase text-warning">Beta</Badge>
              This Source Isn't Wired Yet — Join The Waitlist Below.
            </div>
          )}
          {dataOnly && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              This Source Produces A Research Dataset, Not Contactable Leads. No Skip Trace, No Scrub, No Campaign.
            </p>
          )}
          {!dataOnly && nonUs && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              SMS Launch Is US-Only — This List Is Delivered Email-Ready.
            </p>
          )}
        </div>

        {/* Parameter and exclusion files aren't leads — they're shown separately. */}
        {spec.scrapeTargets?.length ? (
          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">
                {spec.scrapeTargets.length.toLocaleString()} Scrape Targets
              </div>
              <div className="text-[11px] text-muted-foreground">
                Runs This Source Once Per Value · {spec.scrapeTargets.slice(0, 3).join(", ")}
                {spec.scrapeTargets.length > 3 ? "…" : ""}
              </div>
            </div>
            {onClearTargets && (
              <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={onClearTargets}>
                Remove
              </Button>
            )}
          </div>
        ) : null}

        {spec.suppressionFile ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">Suppression: {spec.suppressionFile}</div>
              <div className="text-[11px] text-muted-foreground">
                Saved To Your Workspace — Excluded From Every Run
              </div>
            </div>
          </div>
        ) : null}

        {isRecords && (
          <div>
            <FieldLabel
              confidence={96}
              show={Boolean(spec.recordType) && inf("recordType")}
              hint="Which public filing to pull — probate, code violations, evictions, tax delinquency, and more. Don't see yours? Request it and we'll add it to the backlog."
            >
              Record Type
            </FieldLabel>
            <Popover open={requestOpen} onOpenChange={setRequestOpen}>
              <Select
                value={spec.recordType ?? ""}
                onValueChange={(v) => {
                  // The last item is an affordance, not a fulfillable record type.
                  if (v === REQUEST_RECORD_TYPE) {
                    setRequestOpen(true);
                    return;
                  }
                  set("recordType", v);
                }}
              >
                <PopoverTrigger asChild>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Pick A Record Type" /></SelectTrigger>
                </PopoverTrigger>
                <SelectContent>
                  {RECORD_TYPE_OPTIONS.map((r) => (
                    <SelectItem key={r.id} value={r.label}>{r.label}</SelectItem>
                  ))}
                  {onRequestRecordType && (
                    <>
                      <SelectSeparator />
                      <SelectItem value={REQUEST_RECORD_TYPE}>Request A Record Type…</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
              <PopoverContent align="start" className="w-[28rem] space-y-2">
                <div className="text-sm font-medium text-foreground">Request A Record Type</div>
                <Input
                  autoFocus
                  value={requestText}
                  placeholder="What records do you want? e.g. Building Permits, New LLC Filings"
                  title="What records do you want? e.g. Building Permits, New LLC Filings"
                  onChange={(e) => setRequestText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void submitRecordTypeRequest();
                    }
                  }}
                />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={!requestText.trim() || requesting}
                  onClick={() => void submitRecordTypeRequest()}
                >
                  {requesting ? "Logging…" : "Submit"}
                </Button>
              </PopoverContent>
            </Popover>
          </div>
        )}

        {has("contactTarget") && (
          <div>
            <FieldLabel
              confidence={94}
              show={Boolean(spec.contactTarget) && inf("contactTarget")}
              hint="Whose contact details you want. Listing Agents publish their phone numbers. For Sale By Owner reaches the homeowner directly — the one every wholesaler wants — and those records get skip traced."
            >
              Contact Target
            </FieldLabel>
            <Select
              value={spec.contactTarget ?? ""}
              onValueChange={(v) => set("contactTarget", v as "agents" | "fsbo")}
            >
              <SelectTrigger className="mt-1"><SelectValue placeholder="Agents Or Owners?" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="agents">Listing Agents</SelectItem>
                <SelectItem value="fsbo">For Sale By Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {(has("niche") || has("keyword")) && (
          <div>
            <FieldLabel
              confidence={97}
              show={spec.niches.length > 0 && inf("niches")}
              hintTitle={has("niche") ? "Niches" : "Keywords"}
              hint={
                has("niche")
                  ? "The business categories to search for. Add several, separated by commas — each one is searched across your selected geography."
                  : "The search terms, hashtags, or handles to match on. Add several, separated by commas."
              }
            >
              {has("niche") ? "Niches" : "Keywords"}
            </FieldLabel>
            <CommitInput
              className="mt-1"
              value={spec.niches.join(", ")}
              onCommit={(v) =>
                set("niches", v.split(",").map((s) => s.trim()).filter(Boolean))
              }
              placeholder={has("niche") ? "e.g. HVAC, Roofer" : "e.g. Fintech Founders, #realtor"}
            />
          </div>
        )}


        {has("buyBox") && (
          <BuyBoxFields value={spec.buyBox} onChange={(v) => set("buyBox", v)} />
        )}

        {has("url") && (
          <div>
            <FieldLabel hint="The exact page we should pull contacts from — a company site, a listing page, or a profile URL.">
              Website Or Page URL
            </FieldLabel>
            <CommitInput
              className="mt-1"
              value={spec.targetUrl ?? ""}
              onCommit={(v) => set("targetUrl", v.trim() || null)}
              placeholder="e.g. https://example.com/contact"
            />
          </div>
        )}

        {has("city") && (
          <div>
            <FieldLabel
              confidence={95}
              show={Boolean(spec.city) && inf("city")}
              hint="This source is organized by city, not county — rentals, commercial listings, hosts and venues are all searched by metro."
            >
              City
            </FieldLabel>
            <CommitInput
              className="mt-1"
              value={spec.city ?? ""}
              onCommit={(v) => set("city", v.trim() || null)}
              placeholder="e.g. Miami, FL"
            />
          </div>
        )}

        {has("country") && (
          <div>
            <FieldLabel
              confidence={95}
              show={Boolean(spec.country) && inf("country")}
              hint="This source covers a country or marketplace region rather than US counties. We pre-fill the country the source implies."
            >
              Country / Region
            </FieldLabel>
            <CommitInput
              className="mt-1"
              value={spec.country ?? defaultCountryFor(spec.templateId) ?? ""}
              onCommit={(v) => set("country", v.trim() || null)}
              placeholder={defaultCountryFor(spec.templateId) ?? "e.g. United Kingdom"}
            />
          </div>
        )}

        {(has("audienceFilter") || has("listingFilter")) && (
          <div>
            <FieldLabel
              hintTitle={filterLabel ?? (has("listingFilter") ? "Listing Filters" : "Audience Filters")}
              hint={
                filterLabel
                  ? "Narrow the results by the traits that matter for this source — funding stage, company size, star rating, or review count."
                  : has("listingFilter")
                  ? "Narrow the results by listing traits — price band, days on market, for-sale-by-owner, and similar."
                  : "Narrow the results by audience traits — follower range, location, bio keywords, and similar."
              }
            >
              {filterLabel
                ? `${filterLabel} (Optional)`
                : has("listingFilter")
                  ? "Listing Filters (Optional)"
                  : "Audience Filters (Optional)"}
            </FieldLabel>
            <CommitInput
              className="mt-1"
              value={spec.filters ?? ""}
              onCommit={(v) => set("filters", v.trim() || null)}
              placeholder={
                filterLabel
                  ? "e.g. Series A+, 4.5★ And 50+ Reviews"
                  : has("listingFilter")
                    ? "e.g. Price Band, 90+ Days On Market"
                    : "e.g. 5k–50k Followers"
              }
            />
          </div>
        )}

        {isUpload && (
          <div className="space-y-2">
            <FieldLabel hint="Upload a CSV or XLSX you already have. You map the columns once, then it runs through the same clean, verify, and scrub pipeline.">
              Your Own File
            </FieldLabel>
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
            <div className={has("recency") ? "grid grid-cols-2 gap-3" : ""}>
              <div>
                <FieldLabel
                  confidence={95}
                  show={states.length > 0 && inf("state")}
                  hintTitle="State"
                  hint="The states to search. Pick more than one to run the same criteria across several states at once."
                >
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
              {has("recency") && (
                <div>
                  <FieldLabel hint="How far back to look. 90 means only records filed in the last 90 days — fresher records usually respond better.">
                    Recency (Days)
                  </FieldLabel>
                  <CommitInput
                    className="mt-1"
                    value={spec.recencyDays ? String(spec.recencyDays) : ""}
                    onCommit={(v) => {
                      const n = Number(v.replace(/\D/g, ""));
                      set("recencyDays", n ? n : null);
                    }}
                    placeholder={dedupesByCompany(spec.templateId) ? "30" : "90"}
                  />
                </div>
              )}
            </div>

            {has("counties") && (
            <div>
              <FieldLabel
                confidence={98}
                show={spec.counties.length > 0 && inf("counties")}
                hint={
                  isRecords
                    ? "Narrow to specific counties inside your selected states. Leave it empty to cover the whole state. Badges show whether we have public-records coverage there yet."
                    : "Narrow to specific counties inside your selected states. Leave it empty to cover the whole state. Any US county works for this source."
                }
              >
                Counties
              </FieldLabel>
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
                    : "Pick A State To Choose Counties. Leave Empty To Cover The Whole State."}
                </p>
              )}
            </div>
            )}
          </>
        )}

        {dedupesByCompany(spec.templateId) && (
          <p className="rounded-xl border border-border bg-surface p-3 text-[11px] text-muted-foreground">
            The Lead Here Is The Employer, Not The Posting — We Dedupe By Company So One Company Appears Once,
            However Many Roles It Has Open.
          </p>
        )}

        {/* Industry preset and first-touch angle are campaign concerns, not list
            concerns — they're collected on the list progress screen while the
            scrape runs, then carried into the Campaign Builder as defaults. */}
        <div>
          <FieldLabel
            hintTitle="Outreach Channel"
            hint="How you'll work this list. SMS is the only channel LeadTrace sends on — email and direct mail deliver a file you export. The channel also decides which pipeline stages run."
          >
            Outreach Channel
          </FieldLabel>
          {(() => {
            const options = channelOptions({
              templateId: spec.templateId,
              sourceType: spec.sourceType,
              recordType: spec.recordType,
              country: spec.country,
            });
            const inferred = inferChannel({
              templateId: spec.templateId,
              sourceType: spec.sourceType,
              recordType: spec.recordType,
              country: spec.country,
            });
            const current: Channel = spec.channel ?? inferred;
            return (
              <>
                <Select value={current} onValueChange={(v) => set("channel", v as Channel)}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {options.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CHANNEL_LABEL[c]}
                        {c === inferred ? " (Recommended)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                  {CHANNEL_HINT[current]}
                </p>
              </>
            );
          })()}
        </div>

        <div className="space-y-3">
          {toggles.map((option) => (
            <div key={option.id} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-foreground">{option.label}</span>
                <HelpHint title={option.label}>{option.hint}</HelpHint>
              </div>
              <Switch checked={spec[option.id]} onCheckedChange={(v) => set(option.id, v)} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
