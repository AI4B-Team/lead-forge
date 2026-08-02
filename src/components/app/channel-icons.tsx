import { Smartphone, Mail, Home, Globe, AtSign } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { contactChannels, type ChannelContact, type ChannelKind } from "@/lib/contact-channels";

const ICON: Record<ChannelKind, typeof Mail> = {
  phone: Smartphone,
  email: Mail,
  address: Home,
  website: Globe,
  social: AtSign,
};

/**
 * Channel indicators for a contact. Solid = present and usable, muted +
 * struck-through = present but blocked (DNC, litigator, non-mobile line).
 * Absent channels are never rendered — no empty cells, no dashes.
 */
export function ChannelIcons({ contact }: { contact: ChannelContact }) {
  const channels = contactChannels(contact);
  if (channels.length === 0) {
    return <span className="text-xs text-muted-foreground">No Channels Yet</span>;
  }
  return (
    <div className="flex items-center gap-1.5">
      {channels.map((ch, i) => {
        const Icon = ICON[ch.kind];
        return (
          <Tooltip key={`${ch.kind}-${i}`}>
            <TooltipTrigger asChild>
              <span
                className={`relative inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                  ch.usable
                    ? "border-success/25 bg-success/10 text-success"
                    : "border-border bg-surface-muted text-muted-foreground/60"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {!ch.usable && (
                  <span className="pointer-events-none absolute left-1 right-1 top-1/2 h-px -rotate-45 bg-muted-foreground/60" />
                )}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[240px] text-xs">
              <div className="font-medium">{ch.label}</div>
              <div className="break-words">{ch.value}</div>
              {ch.detail.map((d) => (
                <div key={d} className="text-muted-foreground">{d}</div>
              ))}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
