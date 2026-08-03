import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ScanEye, Check, Loader2, Map as MapIcon, ListChecks, Radar, Info, Lock,
} from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { useCreditBalances } from "@/hooks/use-credit-balances";
import { createScanJob } from "@/lib/property-scan.functions";
import {
  DEFAULT_BUY_BOX, DEFAULT_MATCH_THRESHOLD, DISTRESS_SIGNAL_LABELS, OWNERSHIP_LABELS,
  PARCELS_PER_ZIP, PROPERTY_TYPE_LABELS, SCAN_MODES, SCAN_PRESETS, SCAN_TIERS,
  SCAN_VERTICALS, modeAvailable, previewFunnel, scanCreditQuote,
  type BuyBox, type ScanMode, type ScanTier,
} from "@/lib/property-scan.shared";

export const Route = createFileRoute("/_authenticated/app/property-scan")({
  head: () => ({
    meta: [
      { title: "Property Scan — Find Distressed Properties | LeadTrace" },
      { name: "description", content: "Scan a market for visibly distressed properties, scored against county records, then enriched and skip traced inside your workspace." },
      { property: "og:title", content: "Property Scan" },
      { property: "og:description", content: "Score an entire market for property condition before you spend a credit on imagery." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PropertyScanPage,
});

const MODE_ICON = { area: MapIcon, list: ListChecks, monitor: Radar } as const;

function PropertyScanPage() {
  const { workspaceId } = useWorkspaceId();
  const navigate = useNavigate();
  const { balances } = useCreditBalances();
  const run = useServerFn(createScanJob);

  // Tier drives volume, never access: every paid plan can open this page.
  const tier: ScanTier = "starter";

  const [mode, setMode] = useState<ScanMode>("area");
  const [vertical, setVertical] = useState("investor");
  const [areas, setAreas] = useState("33610");
  const [prompt, setPrompt] = useState(
    "Rundown single-family homes with roof damage, overgrown yards, or signs of vacancy",
  );
  const [threshold, setThreshold] = useState(DEFAULT_MATCH_THRESHOLD);
  const [imagesPer, setImagesPer] = useState<1 | 3>(3);
  const [box, setBox] = useState<BuyBox>(DEFAULT_BUY_BOX);
  const [submitting, setSubmitting] = useState(false);

  const areaList = areas.split(/[,\n]/).map((a) => a.trim()).filter(Boolean);
  const parcelsInArea = Math.max(1, areaList.length) * PARCELS_PER_ZIP;
  const funnel = useMemo(() => previewFunnel(parcelsInArea, box), [parcelsInArea, box]);
  const quote = scanCreditQuote(funnel.scanned, imagesPer);
  const balance = balances.scrape;
  const overBudget = quote > balance;
  const overCap = funnel.scanned > SCAN_TIERS[tier].maxParcelsPerJob;

  const patch = (next: Partial<BuyBox>) => setBox((b) => ({ ...b, ...next }));
  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  async function submit() {
    if (!workspaceId) return;
    setSubmitting(true);
    try {
      await run({
        data: {
          workspaceId,
          name: `Property Scan · ${areaList[0] ?? "List"}`,
          mode,
          vertical,
          prompt,
          matchThreshold: threshold,
          imagesPer,
          buyBox: box,
          areas: areaList,
          sourceListId: null,
          examples: [],
          parcelsInArea: funnel.parcelsInArea,
          parcelsFiltered: funnel.scanned,
          creditsQuoted: quote,
          monitorCadence: mode === "monitor" ? "monthly" : null,
        },
      });
      toast.success("Scan Queued", {
        description: "We'll notify you the moment matches start landing.",
      });
      navigate({ to: "/app/lists" });
    } catch (e) {
      toast.error("Couldn't Queue That Scan", { description: (e as Error).message });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div>
        <PageHeader
          title="Property Scan"
          description="Your buy box runs first, for free. Imagery is only spent on the parcels that survive it — then county records confirm the condition is still true."
          actions={
            <Badge variant="secondary" className="rounded-full gap-1.5">
              <ScanEye className="h-3.5 w-3.5 text-primary" />
              AI Driving For Dollars
            </Badge>
          }
        />

        {/* Mode select */}
        <div className="grid gap-3 md:grid-cols-3">
          {SCAN_MODES.map((m) => {
            const Icon = MODE_ICON[m.id];
            const locked = !modeAvailable(m.id, tier);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => (locked ? toast.info("Monitor Is On Growth And Up", { description: "Standing scans re-score every cycle, so they carry ongoing cost." }) : setMode(m.id))}
                className={`rounded-2xl border p-4 text-left transition ${
                  mode === m.id ? "border-primary bg-primary/5" : "border-border bg-surface hover:border-primary"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="font-display text-sm font-bold text-foreground">{m.title}</span>
                  {locked ? (
                    <span className="ml-auto flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      <Lock className="h-3 w-3" /> Growth
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{m.blurb}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* Data filter — free, and it is the cost control */}
          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-foreground">Data Filter</h2>
              <Badge variant="secondary" className="rounded-full text-[10px]">Free</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Runs before any imagery is fetched. Narrowing this is how you cut the cost of the scan and raise the quality of the list at the same time.
            </p>

            {mode === "area" ? (
              <div className="mt-4">
                <Label className="text-xs">Market</Label>
                <Input
                  value={areas}
                  onChange={(e) => setAreas(e.target.value)}
                  placeholder="ZIPs, cities, or counties — comma separated"
                  className="mt-1.5"
                />
              </div>
            ) : null}

            <div className="mt-4">
              <Label className="text-xs">Ownership</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(OWNERSHIP_LABELS) as Array<keyof typeof OWNERSHIP_LABELS>).map((k) => (
                  <Chip
                    key={k}
                    label={OWNERSHIP_LABELS[k]}
                    active={box.ownership.includes(k)}
                    onClick={() => patch({ ownership: toggle(box.ownership, k) })}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Years Owned — {box.yearsOwnedMin}+</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    Street imagery is typically one to four years old. A 7-year minimum keeps the owner in the picture the same as the owner on the record, and skews toward deferred maintenance.
                  </TooltipContent>
                </Tooltip>
              </div>
              <Slider
                className="mt-3"
                value={[box.yearsOwnedMin]}
                min={0}
                max={30}
                step={1}
                onValueChange={([v]) => patch({ yearsOwnedMin: v ?? 7 })}
              />
            </div>

            <div className="mt-5">
              <Label className="text-xs">Minimum Estimated Equity — {box.equityMin}%</Label>
              <Slider
                className="mt-3"
                value={[box.equityMin]}
                min={0}
                max={100}
                step={5}
                onValueChange={([v]) => patch({ equityMin: v ?? 40 })}
              />
            </div>

            <div className="mt-5">
              <Label className="text-xs">Property Type</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(PROPERTY_TYPE_LABELS) as Array<keyof typeof PROPERTY_TYPE_LABELS>).map((k) => (
                  <Chip
                    key={k}
                    label={PROPERTY_TYPE_LABELS[k]}
                    active={box.propertyTypes.includes(k)}
                    onClick={() => patch({ propertyTypes: toggle(box.propertyTypes, k) })}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Built After</Label>
                <Input
                  type="number"
                  value={box.yearBuiltMin}
                  onChange={(e) => patch({ yearBuiltMin: Number(e.target.value) || 1900 })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Built Before</Label>
                <Input
                  type="number"
                  value={box.yearBuiltMax}
                  onChange={(e) => patch({ yearBuiltMax: Number(e.target.value) || 1990 })}
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="mt-5">
              <Label className="text-xs">Distress Signals</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {(Object.keys(DISTRESS_SIGNAL_LABELS) as Array<keyof typeof DISTRESS_SIGNAL_LABELS>).map((k) => (
                  <Chip
                    key={k}
                    label={DISTRESS_SIGNAL_LABELS[k]}
                    active={box.distressSignals.includes(k)}
                    onClick={() => patch({ distressSignals: toggle(box.distressSignals, k) })}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-3 rounded-xl border border-border bg-surface-muted/60 p-4">
              <label className="flex items-start gap-2.5 text-sm">
                <Checkbox
                  checked={box.excludePermitYears > 0}
                  onCheckedChange={(v) => patch({ excludePermitYears: v ? 5 : 0 })}
                  className="mt-0.5"
                />
                <span>
                  <span className="text-foreground">Exclude properties with permits in the last 5 years</span>
                  <span className="block text-xs text-muted-foreground">
                    A roof permit pulled after the photo was taken invalidates a roof score completely. Permits are free county record.
                  </span>
                </span>
              </label>
              <label className="flex items-center gap-2.5 text-sm text-foreground">
                <Checkbox
                  checked={box.excludeActiveListings}
                  onCheckedChange={(v) => patch({ excludeActiveListings: Boolean(v) })}
                />
                Exclude active listings
              </label>
              <label className="flex items-center gap-2.5 text-sm text-foreground">
                <Checkbox
                  checked={box.excludeSoldLast24mo}
                  onCheckedChange={(v) => patch({ excludeSoldLast24mo: Boolean(v) })}
                />
                Exclude sold in the last 24 months
              </label>
            </div>
          </section>

          {/* Visual criteria — costs credits, runs second */}
          <section className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-base font-bold text-foreground">Visual Criteria</h2>
              <Badge variant="secondary" className="rounded-full text-[10px]">Costs Credits</Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Describe what you're looking for the way you'd explain it to a driver.
            </p>

            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="mt-4"
              placeholder="Rundown single-family homes with roof damage, overgrown yards, or signs of vacancy"
            />

            <div className="mt-4">
              <Label className="text-xs">Presets</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SCAN_PRESETS.map((p) => (
                  <Tooltip key={p.id}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setPrompt(p.prompt)}
                        className="rounded-full border border-border bg-surface-muted px-3 py-1 text-xs text-foreground hover:border-primary"
                      >
                        {p.label}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">{p.blurb}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <Label className="text-xs">Vertical</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {SCAN_VERTICALS.map((v) => (
                  <Chip
                    key={v.id}
                    label={v.label}
                    active={vertical === v.id}
                    onClick={() => setVertical(v.id)}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {SCAN_VERTICALS.find((v) => v.id === vertical)?.note} Switching the vertical re-ranks the list instantly — it never re-scans.
              </p>
            </div>

            <div className="mt-5">
              <Label className="text-xs">Match Threshold — {threshold}</Label>
              <Slider
                className="mt-3"
                value={[threshold]}
                min={50}
                max={100}
                step={5}
                onValueChange={([v]) => setThreshold(v ?? DEFAULT_MATCH_THRESHOLD)}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Only properties scoring above this land in your list.
              </p>
            </div>

            <div className="mt-5">
              <Label className="text-xs">Images Per Property</Label>
              <div className="mt-2 flex gap-2">
                <Chip label="1 — Faster, Cheaper" active={imagesPer === 1} onClick={() => setImagesPer(1)} />
                <Chip label="3 — More Accurate" active={imagesPer === 3} onClick={() => setImagesPer(3)} />
              </div>
            </div>

            {/* Funnel + quote */}
            <div className="mt-6 rounded-xl border border-border bg-surface-muted/60 p-4">
              <FunnelRow label="Parcels In Area" value={funnel.parcelsInArea} />
              <FunnelRow label="Ownership + Tenure" value={funnel.afterOwnership} />
              <FunnelRow label="Equity + Age" value={funnel.afterFinancial} />
              <FunnelRow label="Permit + Negative Filters" value={funnel.scanned} final />
              <div className="mt-3 border-t border-border pt-3 text-sm">
                <div className={overBudget ? "font-medium text-primary" : "text-foreground"}>
                  ~{quote.toLocaleString()} of {balance.toLocaleString()} Lead Credits
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Charged on parcels actually scored. Anything we can't score — no imagery, view blocked, mid-renovation — is refunded automatically.
                </p>
                {overBudget ? (
                  <p className="mt-2 text-xs text-primary">
                    This scan needs {quote.toLocaleString()} credits and you have {balance.toLocaleString()}. Narrow your buy box, or add credits from Billing.
                  </p>
                ) : null}
                {overCap ? (
                  <p className="mt-2 text-xs text-primary">
                    Your plan caps a single scan at {SCAN_TIERS[tier].maxParcelsPerJob.toLocaleString()} parcels. Tighten the filter or split the market.
                  </p>
                ) : null}
              </div>
            </div>

            <Button
              className="mt-5 w-full"
              disabled={submitting || !workspaceId || overBudget || overCap || funnel.scanned === 0}
              onClick={submit}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanEye className="mr-2 h-4 w-4" />}
              Start Scan
            </Button>
          </section>
        </div>
      </div>
    </TooltipProvider>
  );
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs transition ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-muted-foreground hover:border-primary"
      }`}
    >
      {label}
    </button>
  );
}

function FunnelRow({ label, value, final = false }: { label: string; value: number; final?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Check className={`h-3.5 w-3.5 ${final ? "text-primary" : "text-muted-foreground"}`} strokeWidth={3} />
        {label}
      </span>
      <span className={final ? "font-display font-bold text-primary" : "text-foreground"}>
        {value.toLocaleString()}
      </span>
    </div>
  );
}