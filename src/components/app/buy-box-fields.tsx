import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { HelpHint } from "@/components/app/help-hint";
import {
  DEFAULT_BUY_BOX, DISTRESS_SIGNAL_LABELS, OWNERSHIP_LABELS, PROPERTY_TYPE_LABELS,
  type BuyBox,
} from "@/lib/property-scan.shared";

/** Small label + help affordance, matching the rest of the List Builder rail. */
function RailLabel({ children, hint }: { children: string; hint: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</Label>
      <HelpHint title={children}>{hint}</HelpHint>
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
 * The buy box: the free data filter that runs BEFORE any imagery is bought.
 *
 * The rule the whole panel follows: filter before spend on anything that is
 * free to know (ownership, tenure, equity, permits), and tag after spend on
 * anything that costs money to learn (everything the imagery model sees).
 */
export function BuyBoxFields({
  value,
  onChange,
}: { value: BuyBox | null; onChange: (next: BuyBox) => void }) {
  const box = value ?? DEFAULT_BUY_BOX;
  const [advanced, setAdvanced] = useState(false);
  const set = <K extends keyof BuyBox>(key: K, next: BuyBox[K]) => onChange({ ...box, [key]: next });
  const num = (v: string, fallback: number) => {
    const parsed = Number.parseInt(v, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Buy Box</div>
      <p className="-mt-2 text-xs text-muted-foreground">
        These filters run on data first, for free. Only the survivors get scored from imagery, so a tighter box costs
        less. Every condition we can see — tarps, overgrowth, boarded openings, junk vehicles — is scored automatically
        and comes back as a filter on your results.
      </p>

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

      <div className="grid grid-cols-2 gap-3">
        <div>
          <RailLabel hint="A roof permit pulled after the photo was taken means the damage is already fixed. One year is the default — long enough to catch the repair, short enough not to throw away good leads.">
            Exclude Permits Within (Years)
          </RailLabel>
          <Input
            className="mt-1"
            type="number"
            min={0}
            max={20}
            value={box.excludePermitYears}
            onChange={(e) => set("excludePermitYears", num(e.target.value, 1))}
          />
        </div>
        <div>
          <RailLabel hint="Drop anything sold in the last N months — a brand-new owner has not deferred anything yet. Set 0 to keep recent sales.">
            Sold Within (Months)
          </RailLabel>
          <Input
            className="mt-1"
            type="number"
            min={0}
            max={12}
            value={box.soldWithinMonths}
            onChange={(e) => set("soldWithinMonths", num(e.target.value, 3))}
          />
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-foreground">Exclude Active Listings</div>
          <Switch checked={box.excludeActiveListings} onCheckedChange={(v) => set("excludeActiveListings", v)} />
        </div>
      </div>

      <div className="border-t border-border pt-3">
        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
        >
          Advanced
          <ChevronDown className={`h-4 w-4 transition-transform ${advanced ? "rotate-180" : ""}`} />
        </button>
        {advanced && (
          <div className="mt-3">
            <RailLabel hint="Ownership is free to know from assessor data, so pre-filtering on it is what keeps a county-wide scan affordable. Leave it on All and it also comes back as a tag on your results.">
              Ownership Type
            </RailLabel>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Chip active={box.ownership.length === 0} onClick={() => set("ownership", [])}>All</Chip>
              {(Object.keys(OWNERSHIP_LABELS) as BuyBox["ownership"]).map((key) => (
                <Chip key={key} active={box.ownership.includes(key)} onClick={() => set("ownership", toggle(box.ownership, key))}>
                  {OWNERSHIP_LABELS[key]}
                </Chip>
              ))}
            </div>
          </div>
        )}
        </div>
    </div>
  );
}