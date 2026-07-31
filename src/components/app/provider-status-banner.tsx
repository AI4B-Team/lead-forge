import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  getProviderHealth,
  subscribeProviderAlert,
  type ProviderHealth,
  type ProviderKey,
} from "@/lib/providers.functions";

const LABELS: Record<string, string> = {
  scrape: "Business Data Provider",
  lookup: "Carrier Lookup Provider",
  scrub: "DNC & Litigator Scrub Provider",
};

/**
 * Maintenance banner shown when an upstream provider is degraded or down
 * (spec §9.5). Never a generic error — plain language plus a recovery email.
 */
export function ProviderStatusBanner({
  watch,
  workspaceId,
}: {
  watch: ProviderKey[];
  workspaceId?: string;
}) {
  const healthFn = useServerFn(getProviderHealth);
  const subscribeFn = useServerFn(subscribeProviderAlert);
  const [down, setDown] = useState<ProviderHealth[]>([]);
  const [subscribed, setSubscribed] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    healthFn()
      .then((res) => {
        if (!alive) return;
        setDown(
          (res.providers ?? []).filter(
            (p) => watch.includes(p.key as ProviderKey) && p.state !== "up",
          ),
        );
      })
      .catch(() => { /* health is advisory — never block the screen */ });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (down.length === 0) return null;

  const notify = async (key: string) => {
    setBusy(true);
    try {
      await subscribeFn({ data: { providerKey: key as ProviderKey, workspaceId } });
      setSubscribed((s) => [...s, key]);
      toast.success("We'll Email You The Moment It's Back.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Subscribe");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-5 space-y-3">
      {down.map((p) => (
        <div
          key={p.key}
          className="rounded-2xl border border-warning/40 bg-warning/10 p-4 text-sm"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="flex-1">
              <div className="font-semibold text-foreground">
                {LABELS[p.key] ?? p.key} Is {p.state === "down" ? "Under Maintenance" : "Running Slow"}
              </div>
              <p className="mt-1 text-muted-foreground">
                {p.message ??
                  "Your lists are safe. New searches will queue and resume automatically the moment the provider is back."}
              </p>
            </div>
            {subscribed.includes(p.key) ? (
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                You'll Be Notified
              </span>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 rounded-full"
                disabled={busy}
                onClick={() => notify(p.key)}
              >
                <BellRing className="mr-1.5 h-3.5 w-3.5" /> Notify Me When It's Back
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
