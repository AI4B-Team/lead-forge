import { ArrowDown, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { JobSpec } from "@/lib/assistant.shared";
import { US_STATES } from "@/lib/us-geo";

const SOURCE_LABEL: Record<string, string> = {
  business: "Business Search",
  records: "Public Records",
  upload: "Uploaded List",
};

type Row = { label: string; value: string; confidence?: number };

/**
 * Shows the natural-language request next to the structured query it produced,
 * so the operator can trust the interpretation before running anything.
 */
export function AssistantSummary({ prompt, spec }: { prompt: string; spec: JobSpec }) {
  const rows: Row[] = [];
  if (spec.sourceType) rows.push({ label: "Source", value: SOURCE_LABEL[spec.sourceType] ?? spec.sourceType, confidence: 99 });
  if (spec.recordType) rows.push({ label: "Record Type", value: spec.recordType, confidence: 96 });
  if (spec.niches.length) rows.push({ label: "Trade", value: spec.niches.join(", "), confidence: 97 });
  if (spec.counties.length) rows.push({ label: "County", value: spec.counties.join(", "), confidence: 98 });
  else if (spec.state) {
    rows.push({
      label: "State",
      value: US_STATES.find((s) => s.code === spec.state)?.name ?? spec.state,
      confidence: 95,
    });
  }
  if (spec.recencyDays) rows.push({ label: "Recency", value: `Last ${spec.recencyDays} Days` });
  rows.push({ label: "Skip Trace", value: spec.skipTrace ? "Enabled" : "Off" });
  rows.push({ label: "Franchises", value: spec.removeFranchises ? "Removed" : "Kept" });
  rows.push({ label: "Numbers", value: spec.mobileOnly ? "Mobile Only" : "All Line Types" });

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Natural Language
        </div>
        <div className="mt-2 flex gap-2 text-sm text-foreground">
          <Quote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="italic">{prompt}</span>
        </div>

        <div className="my-4 flex justify-center">
          <ArrowDown className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Generated Query
        </div>
        <dl className="mt-3 divide-y divide-border">
          {rows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-3 py-2">
              <dt className="text-xs text-muted-foreground">{r.label}</dt>
              <dd className="flex items-baseline gap-2 text-right">
                <span className="text-sm font-medium text-foreground">{r.value}</span>
                {r.confidence && (
                  <span className="rounded-full bg-success/12 px-1.5 py-0.5 text-[10px] font-semibold text-success">
                    {r.confidence}%
                  </span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
