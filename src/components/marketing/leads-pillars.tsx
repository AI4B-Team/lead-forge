import { ArrowRight } from "lucide-react";

export function PillarArrow() {
  return (
    <div className="flex items-center justify-center py-1 md:py-0">
      <ArrowRight className="arrow-nudge h-6 w-6 rotate-90 text-primary md:h-8 md:w-8 md:rotate-0" />
    </div>
  );
}

export function MiniWorkflow({
  steps,
}: {
  steps: { icon: React.ReactNode; label: string }[];
}) {
  return (
    <div className="relative mt-5">
      <div className="absolute left-[12%] right-[12%] top-7 hidden h-px bg-border sm:block" />
      <div className="relative flex items-start justify-between gap-2">
        {steps.map((s) => (
          <span key={s.label} className="flex flex-1 flex-col items-center gap-2.5 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl border border-border bg-background text-primary">
              {s.icon}
            </span>
            <span className="text-xs font-bold text-foreground">{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function PillarCard({
  icon,
  title,
  items,
  footLabel,
  highlight = false,
}: {
  icon: React.ReactNode;
  title: string;
  items: { icon: React.ReactNode; label: string }[];
  footLabel: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex h-full flex-col rounded-2xl border bg-background p-6 ${
        highlight ? "border-primary/40 shadow-lg" : "border-border"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="font-display text-lg font-black text-foreground">{title}</h3>
      </div>
      <div className="mt-4 h-px w-full bg-border" />
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2.5 text-sm text-foreground">
            <span className="text-primary">{item.icon}</span>
            <span className="min-w-0 truncate">{item.label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {footLabel}
      </div>
    </div>
  );
}
