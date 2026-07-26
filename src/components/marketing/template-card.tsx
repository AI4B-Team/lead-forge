import { Link } from "@tanstack/react-router";
import type { Template } from "@/lib/templates";

export function TemplateCard({ template }: { template: Template }) {
  const Icon = template.icon;
  const logoUrl = template.logoDomain
    ? `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(template.logoDomain)}`
    : null;
  return (
    <Link
      to="/"
      search={{ prompt: template.prompt }}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 hover:border-primary hover:shadow-sm transition text-left"
    >
      <span className={`grid place-items-center h-12 w-12 rounded-xl shrink-0 overflow-hidden bg-white border border-border ${logoUrl ? "" : template.tint}`}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            className="h-7 w-7 object-contain"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
              const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "block";
            }}
          />
        ) : null}
        <Icon className={`h-5 w-5 ${logoUrl ? "hidden" : ""}`} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-display font-bold text-foreground truncate">{template.title}</span>
          {template.beta ? (
            <span className="shrink-0 rounded-full border border-border bg-surface-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Beta
            </span>
          ) : null}
        </span>
        <span className="block text-xs text-muted-foreground mt-0.5 truncate">{template.subtitle}</span>
      </span>
    </Link>
  );
}