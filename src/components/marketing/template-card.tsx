import { Link } from "@tanstack/react-router";
import type { Template } from "@/lib/templates";
import { TemplateLogo } from "@/components/marketing/template-logo";

export function TemplateCard({
  template,
  /**
   * "detail" opens the template's page; "prompt" prefills the homepage prompt;
   * "insert" is an in-app button that hands the template back via onSelect.
   */
  variant = "detail",
  onSelect,
}: {
  template: Template;
  variant?: "detail" | "prompt" | "insert";
  onSelect?: (template: Template) => void;
}) {
  const className =
    "group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 hover:border-primary hover:shadow-sm transition text-left w-full";
  const body = (
    <>
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

  if (variant === "insert") {
    return (
      <button type="button" onClick={() => onSelect?.(template)} className={className}>
        {body}
      </button>
    );
  }

  const linkProps =
    variant === "prompt"
      ? ({ to: "/", search: { prompt: template.prompt } } as const)
      : ({ to: "/templates/$templateId", params: { templateId: template.id } } as const);
  return (
    <Link {...linkProps} className={className}>
      {body}
    </Link>
  );
}