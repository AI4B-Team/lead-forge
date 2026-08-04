import { Link } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { freeGate, freeRecordsLeft, needsCard, type PlanContext } from "@/lib/free-tier.shared";

/**
 * Honest, non-nagging Free plan boundary. Renders only when the thing the user
 * is about to do actually needs a card — never as a permanent upsell strip.
 */
export function FreeTierNotice({
  plan,
  action,
}: {
  plan: PlanContext;
  action: Parameters<typeof freeGate>[1];
}) {
  if (!needsCard(plan)) return null;
  const blocked = freeGate(plan, action);
  if (!blocked) {
    const left = freeRecordsLeft(plan);
    if (!action.recordsRequested || !Number.isFinite(left)) return null;
    return (
      <p className="text-[11px] text-muted-foreground">
        {left} of your 50 free Distress Feed records left.
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-foreground">
      <div className="flex items-start gap-2">
        <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
        <div>
          <p className="font-semibold">Payment Method Needed</p>
          <p className="mt-1 text-muted-foreground">{blocked.message}</p>
          <Link to="/app/billing" className="mt-2 inline-block font-semibold text-primary hover:underline">
            Add Payment Method
          </Link>
        </div>
      </div>
    </div>
  );
}
