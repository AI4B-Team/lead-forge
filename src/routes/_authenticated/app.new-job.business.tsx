import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { NICHES } from "@/lib/mock-data";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { runJob } from "@/lib/pipeline.functions";

export const Route = createFileRoute("/_authenticated/app/new-job/business")({
  head: () => ({ meta: [{ title: "Scrape A Niche — LeadTrace" }] }),
  component: Wizard,
});

function Wizard() {
  const navigate = useNavigate();
  const { workspaceId } = useWorkspaceId();
  const runJobFn = useServerFn(runJob);
  const [picked, setPicked] = useState<string[]>(["HVAC"]);
  const [customNiche, setCustomNiche] = useState("");
  const [state, setState] = useState("FL");
  const [counties, setCounties] = useState<string[]>([]);
  const [pickedCounties, setPickedCounties] = useState<string[]>([]);
  const [removeFranchises, setRemoveFranchises] = useState(true);
  const [mobileOnly, setMobileOnly] = useState(true);
  const [avoidMetros, setAvoidMetros] = useState(false);
  const [busy, setBusy] = useState(false);

  const toggle = (n: string) =>
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n]));
  const toggleCounty = (c: string) =>
    setPickedCounties((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("municipalities")
        .select("county")
        .eq("state", state);
      const uniq = Array.from(new Set((data ?? []).map((r) => r.county as string))).sort();
      setCounties(uniq);
    })();
  }, [state]);

  const addCustomNiche = () => {
    const n = customNiche.trim();
    if (!n) return;
    if (!picked.includes(n)) setPicked((p) => [...p, n]);
    setCustomNiche("");
  };

  const run = async () => {
    if (!workspaceId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          workspace_id: workspaceId,
          source_type: "business",
          status: "queued",
          params: {
            name: `${picked.join(", ") || "Niche Scrape"} · ${state}`,
            niches: picked,
            state,
            counties: pickedCounties,
            remove_franchises: removeFranchises,
            mobile_only: mobileOnly,
            avoid_metros: avoidMetros,
          },
        })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error("Could Not Queue Job");
      toast.success("Job Queued. Running Pipeline…");
      navigate({ to: "/app/jobs/$jobId", params: { jobId: data.id } });
      runJobFn({ data: { jobId: data.id } }).catch((e) =>
        toast.error(e instanceof Error ? e.message : "Pipeline Failed"),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Scrape A Niche" description="Door A · Business Scrape" />
      <Card>
        <CardContent className="pt-6 space-y-6">
          <div>
            <Label>Niches</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {NICHES.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => toggle(n)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                    picked.includes(n)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-surface text-foreground border-border"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Input
                value={customNiche}
                onChange={(e) => setCustomNiche(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCustomNiche();
                  }
                }}
                placeholder="Add A Custom Niche (E.g. Pool Service)"
                className="max-w-xs"
              />
              <Button type="button" variant="outline" className="rounded-full" onClick={addCustomNiche}>
                Add
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value.toUpperCase())}
                maxLength={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Selected Counties</Label>
              <div className="mt-1 text-sm text-muted-foreground">
                {pickedCounties.length ? pickedCounties.join(", ") : "All Counties"}
              </div>
            </div>
          </div>
          {counties.length > 0 && (
            <div>
              <Label>Counties ({counties.length})</Label>
              <div className="mt-2 flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                {counties.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleCounty(c)}
                    className={`rounded-full px-3 py-1 text-xs border ${
                      pickedCounties.includes(c)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-surface text-foreground border-border"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3 rounded-lg border border-border p-4">
            <ToggleRow label="Remove Franchises And Chains" checked={removeFranchises} onChange={setRemoveFranchises} />
            <ToggleRow label="Require Mobile-Reachable" checked={mobileOnly} onChange={setMobileOnly} />
            <ToggleRow label="Focus On Smaller Counties" checked={avoidMetros} onChange={setAvoidMetros} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/app/new-job">Back</Link>
            </Button>
            <Button
              onClick={run}
              disabled={busy || !workspaceId || picked.length === 0}
              className="rounded-full"
            >
              {busy ? "Queuing…" : "Run Job"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}