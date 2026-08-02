import type { ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { meIsSuperAdmin } from "@/lib/admin.functions";

export const PLANS = ["trial", "paid", "comped", "past_due"] as const;
export type Plan = (typeof PLANS)[number];
export type CreditKind = "scrape" | "skip_trace" | "sms";

export type WsRow = {
  id: string;
  name: string;
  industry: string | null;
  billing_plan: string | null;
  monthly_sms_cap: number | null;
  owner_email: string;
  stats: { leads: number; sent: number; sent_month: number; numbers: number };
};

export function planTone(p: string) {
  return p === "comped"
    ? "bg-primary/10 text-primary border-primary/20"
    : p === "paid"
      ? "bg-success/10 text-success border-success/20"
      : p === "past_due"
        ? "bg-danger/10 text-danger border-danger/20"
        : "bg-muted text-muted-foreground border-border";
}

/** Gate every Platform page behind super_admin, with a shared loading/denied shell. */
export function useSuperAdminGate() {
  const fetchIsAdmin = useServerFn(meIsSuperAdmin);
  return useQuery({ queryKey: ["me-is-super-admin"], queryFn: () => fetchIsAdmin() });
}

export function AdminGate({
  gate,
  children,
}: {
  gate: { isLoading: boolean; data?: { isSuperAdmin: boolean } };
  children: ReactNode;
}) {
  if (gate.isLoading) {
    return (
      <div className="p-6 text-muted-foreground">
        <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!gate.data?.isSuperAdmin) {
    return (
      <div className="p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-danger" /> Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Only Super Admins Can Access This Console.
          </CardContent>
        </Card>
      </div>
    );
  }
  return <>{children}</>;
}

export function HealthRow({ label, value, tone }: { label: string; value: string; tone?: "danger" }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={`font-display text-sm font-bold tabular-nums ${tone === "danger" ? "text-danger" : "text-foreground"}`}
      >
        {value}
      </span>
    </div>
  );
}