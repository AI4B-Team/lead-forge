import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HelpHint } from "@/components/app/help-hint";
import {
  DEFAULT_BUY_BOX, DISTRESS_SIGNAL_LABELS, OWNERSHIP_LABELS, PROPERTY_TYPE_LABELS,
  SCAN_PRESETS, type BuyBox,
} from "@/lib/property-scan.shared";

/** Small label + help affordance, matching the rest of the List Builder rail. */
function RailLabel({ children, hint }: { children: React.ReactNode; hint: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</Label>
      <HelpHint text={hint} />
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-surface text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function toggle<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/**
 * Visual Criteria. The one genuinely new field: plain-language condition
 * signals the imagery model scores against. The assistant pre-fills it from the
 * operator's prompt and it edits here exactly like Niches — there is
 * deliberately no second free-text prompt box on the screen.
 */
export function VisualCriteriaField({
  value,
  onChange,
  inferred = false,
}: { value: string[]; onChange: (next: string[]) => void; inferred?: boolean }) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <RailLabel hint="What the house has to look like. We score recent street-level imagery against these phrases, so write them the way you'd describe a house you'd knock on — 'tarped roof', 'overgrown yard', 'boarded windows'.">
          Visual Criteria
        </RailLabel>
        {inferred && value.length > 0 && (
          <Badge variant="secondary" className="h-5 text-[10px]">From Your Prompt</Badge>
        )}
      </div>
      <Input
        className="mt-1"
        value={value.join(", ")}
        placeholder="e.g. Tarped roof, overgrown yard, boarded windows"
        onChange={(e) => onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
      />
      <div className="mt-2 flex flex-wrap gap-1.5">
        {SCAN_PRESETS.map((preset) => (
          <Chip
            key={preset.id}
            active={value.includes(preset.prompt)}
            onClick={() => onChange(toggle(value, preset.prompt))}
          >
            {preset.label}
          </Chip>
        ))}
      </div>
    </div>
  );
}

/**
 * The buy box: the free data filter that runs BEFORE any imagery is bought.
 * Narrowing it here is what keeps a scan affordable, so it lives in the same
 * rail as every other "which leads to pull" control.
 */
export function BuyBoxFields({
  value,
  onChange,
}: { value: BuyBox | null; onChange: (next: BuyBox) => void }) {
  const box = value ?? DEFAULT_BUY_BOX;
  const set = <K extends keyof BuyBox>(key: K, next: BuyBox[K]) => onChange({ ...box, [key]: next });
  const num = (v: string, fallback: number) => {
    const parsed = Number.parseInt(v, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buy Box</div>
      <p className="-mt-2 text-xs text-muted-foreground">
        These filters run on data first, for free. Only the survivors get scored from imagery, so a tighter box costs less.
      </p>

      <div>
        <RailLabel hint="Who owns the house. Absentee and out-of-area owners are the classic wholesale target; owner-occupied is what home-service contractors want.">
          Ownership
        </RailLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(Object.keys(OWNERSHIP_LABELS) as BuyBox["ownership"]).map((key) => (
            <Chip key={key} active={box.ownership.includes(key)} onClick={() => set("ownership", toggle(box.ownership, key))}>
              {OWNERSHIP_LABELS[key]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <RailLabel hint="Street imagery is one to four years old, so a longer hold means the owner in the picture is still the owner today.">
            Years Owned (Min)
          </RailLabel>
          <Input
            className="mt-1"
            type="number"
            min={0}
            max={60}
            value={box.yearsOwnedMin}
            onChange={(e) => set("yearsOwnedMin", num(e.target.value, 0))}
          />
        </div>
        <div>
          <RailLabel hint="Minimum estimated equity as a percentage. High equity means the owner can actually accept a cash offer.">
            Minimum Equity %
          </RailLabel>
          <Input
            className="mt-1"
            type="number"
            min={0}
            max={100}
            value={box.equityMin}
            onChange={(e) => set("equityMin", num(e.target.value, 0))}
          />
        </div>
      </div>

      <div>
        <RailLabel hint="Which structures to include. Single family is the default because condition scores read most reliably from the street.">
          Property Type
        </RailLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(Object.keys(PROPERTY_TYPE_LABELS) as BuyBox["propertyTypes"]).map((key) => (
            <Chip key={key} active={box.propertyTypes.includes(key)} onClick={() => set("propertyTypes", toggle(box.propertyTypes, key))}>
              {PROPERTY_TYPE_LABELS[key]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <RailLabel hint="Older housing stock carries more deferred maintenance. Widen this if your market is mostly newer builds.">
            Built After
          </RailLabel>
          <Input
            className="mt-1"
            type="number"
            min={1800}
            max={2030}
            value={box.yearBuiltMin}
            onChange={(e) => set("yearBuiltMin", num(e.target.value, 1900))}
          />
        </div>
        <div>
          <RailLabel hint="Set the upper bound on build year. Leave it high to include new construction.">
            Built Before
          </RailLabel>
          <Input
            className="mt-1"
            type="number"
            min={1800}
            max={2030}
            value={box.yearBuiltMax}
            onChange={(e) => set("yearBuiltMax", num(e.target.value, 1990))}
          />
        </div>
      </div>

      <div>
        <RailLabel hint="Optional paper-trail signals. Each one narrows the list sharply, so start with none and add only what you need.">
          Distress Signals
        </RailLabel>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {(Object.keys(DISTRESS_SIGNAL_LABELS) as BuyBox["distressSignals"]).map((key) => (
            <Chip key={key} active={box.distressSignals.includes(key)} onClick={() => set("distressSignals", toggle(box.distressSignals, key))}>
              {DISTRESS_SIGNAL_LABELS[key]}
            </Chip>
          ))}
        </div>
      </div>

      <div>
        <RailLabel hint="A roof permit pulled after the photo was taken means the damage is already fixed. Excluding recent permits is what keeps stale imagery from wasting your calls.">
          Exclude Permits Within (Years)
        </RailLabel>
        <Input
          className="mt-1"
          type="number"
          min={0}
          max={20}
          value={box.excludePermitYears}
          onChange={(e) => set("excludePermitYears", num(e.target.value, 0))}
        />
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-foreground">Exclude Active Listings</div>
          <Switch checked={box.excludeActiveListings} onCheckedChange={(v) => set("excludeActiveListings", v)} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-foreground">Exclude Sold In Last 24 Months</div>
          <Switch checked={box.excludeSoldLast24mo} onCheckedChange={(v) => set("excludeSoldLast24mo", v)} />
        </div>
      </div>
    </div>
  );
}