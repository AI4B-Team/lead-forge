import { useState } from "react";
import type { Template } from "@/lib/templates";
import { cn } from "@/lib/utils";

/** Normalizes a template logoDomain ("google.com/maps") into a favicon host. */
function logoHost(domain: string) {
  return domain.replace(/^https?:\/\//, "").split("/")[0];
}

/**
 * Shared brand mark for templates: real company logo when the template maps to
 * a known domain, tinted Lucide icon otherwise (or when the logo fails to load).
 */
export function TemplateLogo({
  template,
  className,
  iconClassName,
  imgClassName,
}: {
  template: Template;
  className?: string;
  iconClassName?: string;
  imgClassName?: string;
}) {
  const Icon = template.icon;
  const [failed, setFailed] = useState(false);
  const host = template.logoDomain ? logoHost(template.logoDomain) : null;
  const showLogo = Boolean(host) && !failed;

  return (
    <span
      className={cn(
        "grid place-items-center shrink-0 overflow-hidden rounded-xl border border-border",
        showLogo ? "bg-white" : template.tint,
        className ?? "h-12 w-12",
      )}
    >
      {showLogo ? (
        <img
          src={`https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(host!)}`}
          alt={`${template.title} logo`}
          className={cn("object-contain", imgClassName ?? "h-7 w-7")}
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon className={cn(iconClassName ?? "h-5 w-5")} />
      )}
    </span>
  );
}
