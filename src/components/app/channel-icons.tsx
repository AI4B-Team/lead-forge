import { Smartphone, Mail, Home, Globe, AtSign } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { contactChannels, isTextablePhone, type ChannelContact, type ChannelKind } from "@/lib/contact-channels";

const ICON: Record<ChannelKind, typeof Mail> = {
  phone: Smartphone,
  email: Mail,
  address: Home,
  website: Globe,
  social: AtSign,
};

/**
 * Channel indicators for a contact — bare status glyphs, never buttons.
 * Colored = present and usable, muted + struck-through = present but blocked
 * (DNC, litigator, non-mobile line). Absent channels are never rendered.
 */
export function ChannelIcons({ contact }: { contact: ChannelContact }) {
  const channels = contactChannels(contact);
  if (channels.length === 0) {
    return <span className="text-xs text-muted-foreground">No Channels Yet</span>;
  }
  return (
    <div className="flex items-center gap-2">
      {channels.map((ch, i) => {
        const Icon = ICON[ch.kind];
        return (
          <Tooltip key={`${ch.kind}-${i}`}>
            <TooltipTrigger asChild>
              <span
                className={`relative inline-flex items-center justify-center ${
                  ch.usable ? "text-success" : "text-muted-foreground/50"
                }`}
              >
                <Icon className="h-4 w-4" strokeWidth={2} />
                {!ch.usable && (
                  <span className="pointer-events-none absolute left-[-1px] right-[-1px] top-1/2 h-px -rotate-45 bg-muted-foreground/50" />
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

/**
 * Phone as a real column: the number is on the surface, with line type and
 * suppression state as inline metadata underneath. Blocked channels render
 * muted + struck so they read as unusable. Absent → a light em dash.
 */
export function PhoneCell({ contact }: { contact: ChannelContact }) {
  if (!contact.phone) return <EmptyChannel />;

  const usable = isTextablePhone(contact);
  const type = (contact.phone_type ?? "unknown").toLowerCase();
  const blocked = contact.disposition === "dnc" || contact.disposition === "litigator";

  const meta = blocked
    ? contact.disposition === "dnc"
      ? "DNC — Blocked"
      : "Litigator — Blocked"
    : type === "mobile"
      ? "Mobile · Textable"
      : type === "landline"
        ? "Landline"
        : type === "voip"
          ? "VoIP"
          : "Line Type Unknown";

  return (
    <div className="min-w-0">
      <div
        className={`whitespace-nowrap font-medium ${
          usable ? "text-foreground" : "text-muted-foreground/70 line-through"
        }`}
      >
        {contact.phone}
      </div>
      <div className={`text-xs ${blocked ? "text-destructive/80" : "text-muted-foreground"}`}>{meta}</div>
    </div>
  );
}

/** Email as a real column, same graceful-empty and reachability rules. */
export function EmailCell({ contact }: { contact: ChannelContact }) {
  if (!contact.email) return <EmptyChannel />;

  const blocked = contact.disposition === "litigator";
  return (
    <div className="min-w-0 max-w-[220px]">
      <div
        title={contact.email}
        className={`truncate ${blocked ? "text-muted-foreground/70 line-through" : "text-foreground"}`}
      >
        {contact.email}
      </div>
      <div className={`text-xs ${blocked ? "text-destructive/80" : "text-muted-foreground"}`}>
        {blocked ? "Excluded From Outreach" : "Email-Reachable"}
      </div>
    </div>
  );
}

function EmptyChannel() {
  return <span className="text-muted-foreground/40">—</span>;
}
