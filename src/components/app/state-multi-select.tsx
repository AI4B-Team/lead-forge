import { useState } from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ScrollArea } from "@/components/ui/scroll-area";
import { US_STATES } from "@/lib/us-geo";

/**
 * Multi-select state picker. Operators often work several states at once, so
 * this stays open across selections and stores 2-letter codes.
 */
export function StateMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const toggle = (code: string) =>
    onChange(value.includes(code) ? value.filter((v) => v !== code) : [...value, code]);

  return (
    <div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="mt-1 w-full justify-between font-normal">
            <span className="truncate text-left">
              {value.length === 0
                ? "Pick One Or More States"
                : value.length === 1
                  ? `${value[0]} · ${US_STATES.find((s) => s.code === value[0])?.name ?? ""}`
                  : `${value.length} States Selected`}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search States…" />
            <CommandList>
              <CommandEmpty>No State Found.</CommandEmpty>
              <ScrollArea className="h-64">
                <CommandGroup>
                  {US_STATES.map((s) => (
                    <CommandItem key={s.code} value={`${s.code} ${s.name}`} onSelect={() => toggle(s.code)}>
                      <Check className={`mr-2 h-4 w-4 ${value.includes(s.code) ? "opacity-100" : "opacity-0"}`} />
                      {s.code} · {s.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </ScrollArea>
            </CommandList>
          </Command>
          {value.length > 0 && (
            <div className="flex items-center justify-end border-t border-border p-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange([])}>
                Clear
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {value.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((code) => (
            <Badge key={code} variant="outline" className="gap-1 text-[10px] uppercase">
              {code}
              <button type="button" aria-label={`Remove ${code}`} onClick={() => onChange(value.filter((v) => v !== code))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}