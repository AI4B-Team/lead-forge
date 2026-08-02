import { Link } from "@tanstack/react-router";
import { Check } from "lucide-react";
import type { Template } from "@/lib/templates";
import { TemplateLogo } from "@/components/marketing/template-logo";

export function TemplateCard({
  template,
  /**
   * "detail" opens the template's page; "prompt" selects the template as
   * context for the homepage prompt hero (never inserting its text);
   * "insert" is an in-app button that hands the template back via onSelect.
   */
  variant = "detail",
  onSelect,
  selected = false,
}: {
  template: Template;
  variant?: "detail" | "prompt" | "insert";
  onSelect?: (template: Template) => void;
  /** Persistent selected state for the "insert" and "prompt" variants. */
  selected?: boolean;
}) {
  const className =
    `group relative flex items-center gap-4 rounded-2xl border p-4 hover:border-primary hover:shadow-sm transition text-left w-full ${
      selected ? "border-primary bg-primary/5" : "border-border bg-surface"
    }`;
  const body = (
    <>
      {selected ? (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-3 w-3" />
        </span>
      ) : null}
      <TemplateLogo template={template} />
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
    </>
  );

  if (variant === "insert" || variant === "prompt") {
    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onSelect?.(template)}
        className={className}
      >
        {body}
      </button>
    );
  }

  const linkProps = {
    to: "/templates/$templateId",
    params: { templateId: template.id },
  } as const;
  return (
    <Link {...linkProps} className={className}>
      {body}
    </Link>
  );
}