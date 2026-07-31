import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { countiesForState, formatCounty, parseCounty } from "@/lib/us-geo";

/**
 * Multi-select county picker scoped to the selected state.
 * Values are stored as "Hillsborough, FL" so they stay compatible with job params.
 */
export function CountyMultiSelect({
  state,
  value,
  onChange,
  renderBadgeClassName,
  renderBadgeLabel,
}: {
  state: string | null;
  value: string[];
  onChange: (next: string[]) => void;
  renderBadgeClassName?: (county: string) => string;
  renderBadgeLabel?: (county: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const counties = useMemo(() => countiesForState(state), [state]);
  const selectedInState = useMemo(
    () => value.filter((v) => !state || parseCounty(v).state === state.toUpperCase()),
    [value, state],
  );

  const toggle = (county: string) => {
    if (!state) return;
    const label = formatCounty(county, state);
    onChange(
      value.some((v) => v.toLowerCase() === label.toLowerCase())
        ? value.filter((v) => v.toLowerCase() !== label.toLowerCase())
        : [...value, label],
    );
  };

  const isSelected = (county: string) =>
    !!state && value.some((v) => v.toLowerCase() === formatCounty(county, state).toLowerCase());

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            disabled={!state}
            className="mt-1 w-full justify-between font-normal"
          >
            <span className="truncate text-left">
              {!state
                ? "Pick A State First"
                : selectedInState.length
                  ? `${selectedInState.length} Selected`
                  : `All ${counties.length} Counties In ${state.toUpperCase()}`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={`Search ${counties.length} Counties…`} />
            <CommandList>
              <CommandEmpty>No County Found.</CommandEmpty>
              <ScrollArea className="h-64">
                <CommandGroup>
                  {counties.map((county) => (
                    <CommandItem key={county} value={county} onSelect={() => toggle(county)}>
                      <Check className={`mr-2 h-4 w-4 ${isSelected(county) ? "opacity-100" : "opacity-0"}`} />
                      {county}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
          </Command>
          <div className="flex items-center justify-between border-t border-border p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => state && onChange(counties.map((c) => formatCounty(c, state)))}
            >
              Select All
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
              Clear
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((c) => (
            <Badge
              key={c}
              variant="outline"
              className={`gap-1 text-[10px] uppercase ${renderBadgeClassName?.(c) ?? ""}`}
            >
              {renderBadgeLabel?.(c) ?? c}
              <button
                type="button"
                aria-label={`Remove ${c}`}
                onClick={() => onChange(value.filter((v) => v !== c))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
