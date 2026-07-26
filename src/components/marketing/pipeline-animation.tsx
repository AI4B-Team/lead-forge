import { useEffect, useState } from "react";
import { Search, Landmark, Upload, Check } from "lucide-react";

const STATES = [
  "Scraped 3,699",
  "Skip Traced 2,810",
  "Clean 2,140  ·  DNC 512  ·  Litigator 47",
  "Campaign Live",
] as const;

export function PipelineAnimation() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % STATES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full max-w-md">
      <div className="grid grid-cols-3 gap-3 mb-4">
        <SourceChip icon={<Search className="h-4 w-4" />} label="Business" />
        <SourceChip icon={<Landmark className="h-4 w-4" />} label="Records" />
        <SourceChip icon={<Upload className="h-4 w-4" />} label="Upload" />
      </div>
      <div className="rounded-2xl bg-surface p-6 shadow-2xl rotate-[-1.5deg] border border-border">
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
          Pipeline Status
        </div>
        <div className="min-h-16 flex items-center">
          <div className="text-2xl font-semibold text-foreground transition-all duration-500">
            {STATES[i]}
          </div>
        </div>
        <div className="mt-4 h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${((i + 1) / STATES.length) * 100}%` }}
          />
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Check className="h-3.5 w-3.5 text-success" />
          Compliance Scrub Baked In
        </div>
      </div>
      <div className="absolute -bottom-6 -right-6 rounded-2xl bg-ink text-ink-foreground p-4 rotate-[3deg] shadow-xl border border-white/10 hidden md:block">
        <div className="text-[10px] uppercase tracking-widest text-ink-muted">Reply Rate</div>
        <div className="text-xl font-semibold">12.4%</div>
      </div>
    </div>
  );
}

function SourceChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="rounded-xl bg-surface border border-border px-3 py-2 flex items-center gap-2 text-xs font-medium text-foreground">
      {icon}
      {label}
    </div>
  );
}