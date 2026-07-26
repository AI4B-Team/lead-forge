import { Link } from "@tanstack/react-router";
import type { Template } from "@/lib/templates";

export function TemplateCard({ template }: { template: Template }) {
  const Icon = template.icon;
  return (
    <Link
      to="/"
      search={{ prompt: template.prompt }}
      className="group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 hover:border-primary hover:shadow-sm transition text-left"
    >
      <span className={`grid place-items-center h-12 w-12 rounded-xl shrink-0 ${template.tint}`}>
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block font-display font-bold text-foreground truncate">{template.title}</span>
        <span className="block text-xs text-muted-foreground mt-0.5 truncate">{template.subtitle}</span>
      </span>
    </Link>
  );
}