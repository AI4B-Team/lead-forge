import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { getRegistration, advanceRegistration, submitBrandToProvider, submitCampaignToProvider } from "@/lib/numbers.functions";

export const Route = createFileRoute("/_authenticated/app/registration")({
  head: () => ({ meta: [{ title: "10DLC Registration — LeadTrace" }] }),
  component: RegistrationPage,
});

function StatusPill({ label, value }: { label: string; value: string | null | undefined }) {
  const v = value ?? "pending";
  const dot =
    v === "approved" ? "bg-success shadow-[0_0_8px_var(--color-success)]" :
    v === "rejected" ? "bg-danger shadow-[0_0_8px_var(--color-danger)]" :
    v === "submitted" ? "bg-warn shadow-[0_0_8px_var(--color-warn)]" :
    "bg-muted-foreground shadow-[0_0_8px_var(--color-muted-foreground)]";
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-border/50 ring-1 ring-inset ring-border/30 transition-colors hover:bg-white/[0.07]">
      <div className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="text-[11px] font-medium text-muted-foreground tracking-wide uppercase">
        {label}: {v}
      </span>
    </div>
  );
}

function RegistrationPage() {
  const { workspaceId } = useWorkspaceId();
  const fetchReg = useServerFn(getRegistration);
  const advance = useServerFn(advanceRegistration);
  const submitBrandFn = useServerFn(submitBrandToProvider);
  const submitCampaignFn = useServerFn(submitCampaignToProvider);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["registration", workspaceId],
    queryFn: () => fetchReg({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const reg = data?.registration;
  const refs = (reg?.provider_refs ?? {}) as { brand?: any; campaign?: any };

  const [legal, setLegal] = useState(refs.brand?.legal_name ?? "");
  const [ein, setEin] = useState(refs.brand?.ein ?? "");
  const [website, setWebsite] = useState(refs.brand?.website ?? "");
  const [email, setEmail] = useState(refs.brand?.contact_email ?? "");
  const [useCase, setUseCase] = useState(refs.campaign?.use_case ?? "Lead follow-up & appointment setting");
  const [samples, setSamples] = useState((refs.campaign?.sample_messages ?? [
    "Hi {{first_name}}, saw your property listed — 2 quick questions?",
    "Reply STOP to opt out."
  ]).join("\n"));
  const [optIn, setOptIn] = useState(refs.campaign?.opt_in_flow ?? "Lead provided phone via public record / opt-in form. STOP + HELP honored.");
  const [busy, setBusy] = useState<null | "brand" | "campaign" | "approve">(null);

  if (!workspaceId) return null;

  const submitBrand = async () => {
    setBusy("brand");
    try {
      const r = await submitBrandFn({
        data: { workspaceId, brand: { legal_name: legal, ein, website, contact_email: email } },
      });
      toast.success(r.providerId ? `Brand Submitted (${r.status}).` : "Brand Saved. Provider Not Configured.");
      qc.invalidateQueries({ queryKey: ["registration", workspaceId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally { setBusy(null); }
  };
  const submitCampaign = async () => {
    setBusy("campaign");
    try {
      const r = await submitCampaignFn({
        data: {
          workspaceId,
          campaign: {
            use_case: useCase,
            sample_messages: samples.split("\n").filter(Boolean),
            opt_in_flow: optIn,
          },
        },
      });
      toast.success(r.providerId ? `Campaign Submitted (${r.status}).` : "Campaign Saved. Provider Not Configured.");
      qc.invalidateQueries({ queryKey: ["registration", workspaceId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally { setBusy(null); }
  };
  const approveDemo = async () => {
    // Stub: real flow waits for TCR webhook. Demo button flips both statuses.
    setBusy("approve");
    try {
      await advance({ data: { workspaceId, brand_status: "approved", campaign_status: "approved" } });
      toast.success("Approved. Sending Is Now Unlocked.");
      qc.invalidateQueries({ queryKey: ["registration", workspaceId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally { setBusy(null); }
  };

  const brandApproved = reg?.brand_status === "approved";
  const campaignApproved = reg?.campaign_status === "approved";

  return (
    <div>
      <div className="flex flex-col gap-3 mb-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">10DLC Registration</h1>
          <div className="flex items-center gap-2 shrink-0">
            <StatusPill label="Brand" value={reg?.brand_status} />
            <StatusPill label="Campaign" value={reg?.campaign_status} />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground whitespace-nowrap">
            A2P Brand + Campaign Approval. Sending Is Blocked Server-Side Until Campaign Status Is Approved.
          </p>
          <div className="hidden sm:block flex-grow h-px bg-white/5" />
        </div>
      </div>

      {campaignApproved ? (
        <div className="mb-6 rounded-2xl border border-success/30 bg-success/5 p-4 flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-success" />
          <div className="font-display font-bold text-foreground">Registration Approved — Sending Is Unlocked.</div>
          <Button asChild size="sm" variant="outline" className="ml-auto rounded-full"><Link to="/app/campaigns">Go To Campaigns</Link></Button>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-warn/30 bg-warn/5 p-4 flex items-center gap-3">
          <div className="text-sm text-muted-foreground">Complete Both Steps. Real Approval Takes 1–3 Business Days Via TCR.</div>
          <Button size="sm" variant="outline" className="ml-auto rounded-full" onClick={approveDemo} disabled={busy === "approve"}>
            {busy === "approve" ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
            Simulate Approval (Demo)
          </Button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Step 1 · Brand</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Legal Name</Label><Input value={legal} onChange={(e) => setLegal(e.target.value)} /></div>
            <div><Label>EIN</Label><Input value={ein} onChange={(e) => setEin(e.target.value)} /></div>
            <div><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
            <div><Label>Contact Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <Button className="w-full rounded-full" onClick={submitBrand} disabled={busy === "brand" || brandApproved}>
              {busy === "brand" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {brandApproved ? "Brand Approved" : "Submit Brand"}
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Step 2 · Campaign</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div><Label>Use Case</Label><Input value={useCase} onChange={(e) => setUseCase(e.target.value)} /></div>
            <div><Label>Sample Messages (One Per Line)</Label><Textarea rows={4} value={samples} onChange={(e) => setSamples(e.target.value)} /></div>
            <div><Label>Opt-In Flow</Label><Textarea rows={3} value={optIn} onChange={(e) => setOptIn(e.target.value)} /></div>
            <Button className="w-full rounded-full" onClick={submitCampaign} disabled={busy === "campaign" || campaignApproved}>
              {busy === "campaign" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              {campaignApproved ? "Campaign Approved" : "Submit Campaign"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}