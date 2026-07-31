import { Card, CardContent } from "@/components/ui/card";
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

/** The live, editable Job Spec. Chat fills it in, the operator can override. */
export function JobSpecCard({
  spec,
  onChange,
  coverage,
  estimate,
}: {
  spec: JobSpec;
  onChange: (next: JobSpec) => void;
  coverage: Array<{ county: string; coverage: Coverage }>;
  estimate: { rows: number; skipTraceCredits: number; scrapeCredits: number } | null;
}) {
  const set = <K extends keyof JobSpec>(key: K, value: JobSpec[K]) => onChange({ ...spec, [key]: value });
  const covFor = (county: string): Coverage =>
    coverage.find((c) => c.county.toLowerCase() === county.toLowerCase())?.coverage ?? "unknown";

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="font-display font-bold text-foreground">Job Spec</div>
          <Badge variant="outline" className="text-[10px] uppercase">Editable</Badge>
        </div>

        <div>
          <Label>Source</Label>
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

        {spec.sourceType === "records" ? (
          <div>
            <Label>Record Type</Label>
            <Select value={spec.recordType ?? ""} onValueChange={(v) => set("recordType", v)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Pick A Record Type" /></SelectTrigger>
              <SelectContent>
                {RECORD_TYPES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <Label>Niches</Label>
            <Input
              className="mt-1"
              value={spec.niches.join(", ")}
              onChange={(e) =>
                set("niches", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))
              }
              placeholder="HVAC, Roofer"
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>State</Label>
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
          <div>
            <Label>Recency (Days)</Label>
            <Input
              className="mt-1"
              value={spec.recencyDays ?? ""}
              onChange={(e) => {
                const n = Number(e.target.value.replace(/\D/g, ""));
                set("recencyDays", n ? n : null);
              }}
              placeholder="90"
            />
          </div>
        </div>

        <div>
          <Label>Counties</Label>
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
          <Textarea
            className="mt-1"
            rows={3}
            value={spec.messageAngle ?? ""}
            onChange={(e) => set("messageAngle", e.target.value || null)}
            placeholder="Empathetic, low-pressure opener…"
          />
        </div>

        <div className="space-y-3">
          {([
            ["skipTrace", "Skip Trace Missing Numbers"],
            ["removeFranchises", "Remove Franchises"],
            ["dedupe", "Dedupe Against Past Lists"],
            ["mobileOnly", "Mobile Numbers Only"],
          ] as const).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-foreground">{label}</span>
              <Switch checked={spec[key]} onCheckedChange={(v) => set(key, v)} />
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          {estimate ? (
            <>
              <div className="font-medium text-foreground">Coverage + Cost Preview</div>
              <div className="mt-1">
                About {estimate.rows.toLocaleString()} Rows · ~{estimate.scrapeCredits.toLocaleString()} Scrape Credits
                {estimate.skipTraceCredits ? ` · ~${estimate.skipTraceCredits.toLocaleString()} Skip-Trace Credits` : ""}
              </div>
              <div className="mt-1">Estimates Only. Nothing Is Charged Until You Run The Job.</div>
            </>
          ) : (
            "Resolve A Source And Geography To See A Cost Preview."
          )}
        </div>
      </CardContent>
    </Card>
  );
}