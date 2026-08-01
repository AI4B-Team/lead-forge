import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Loader2, ShieldCheck, Building2, BadgeCheck, MessageSquare,
  Phone, Flag, ArrowLeft, ArrowRight, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/use-workspace";
import {
  getRegistration, advanceRegistration, submitBrandToProvider,
  submitCampaignToProvider, listNumbers, buyNumbers,
} from "@/lib/numbers.functions";
import { AccountTabs } from "@/components/app/account-tabs";

export const Route = createFileRoute("/_authenticated/app/registration")({
  head: () => ({
    meta: [
      { title: "Brand & SMS Setup — LeadTrace" },
      { name: "description", content: "Register your texting brand, submit your campaign use case, and add sending numbers — a resumable setup wizard with $0 registration fees." },
    ],
  }),
  component: RegistrationPage,
});

const STEPS = [
  { id: 1, label: "Business Info", icon: Building2 },
  { id: 2, label: "Brand Registration", icon: BadgeCheck },
  { id: 3, label: "Campaign Use Case", icon: MessageSquare },
  { id: 4, label: "Sending Numbers", icon: Phone },
  { id: 5, label: "Status & Next Steps", icon: Flag },
] as const;

function StatusPill({ label, value }: { label: string; value: string | null | undefined }) {
  const v = value ?? "pending";
  const themes: Record<string, string> = {
    approved: "bg-success/10 border-success/20 text-success",
    submitted: "bg-warn/10 border-warn/20 text-warn",
    rejected: "bg-danger/10 border-danger/20 text-danger",
    pending: "bg-muted border-border text-muted-foreground",
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${themes[v] ?? themes.pending}`}>
      <div className="w-1.5 h-1.5 rounded-full bg-current" />
      <span className="text-[11px] font-medium tracking-wide uppercase">{label}: {v}</span>
    </div>
  );
}

function RegistrationPage() {
  const { workspaceId } = useWorkspaceId();
  const fetchReg = useServerFn(getRegistration);
  const advance = useServerFn(advanceRegistration);
  const submitBrandFn = useServerFn(submitBrandToProvider);
  const submitCampaignFn = useServerFn(submitCampaignToProvider);
  const fetchNumbers = useServerFn(listNumbers);
  const buyFn = useServerFn(buyNumbers);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["registration", workspaceId],
    queryFn: () => fetchReg({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const { data: numbersData } = useQuery({
    queryKey: ["numbers", workspaceId],
    queryFn: () => fetchNumbers({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const reg = data?.registration;
  const refs = (reg?.provider_refs ?? {}) as {
    brand?: Record<string, string>;
    campaign?: { use_case?: string; sample_messages?: string[]; opt_in_flow?: string };
    business?: Record<string, string>;
    wizard_step?: number;
  };

  const [step, setStep] = useState(1);
  const [hydrated, setHydrated] = useState(false);
  const [legal, setLegal] = useState("");
  const [ein, setEin] = useState("");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [useCase, setUseCase] = useState("Lead follow-up & appointment setting");
  const [samples, setSamples] = useState("");
  const [optIn, setOptIn] = useState("");
  const [quantity, setQuantity] = useState<string>("5");
  const [areaCodes, setAreaCodes] = useState("");
  const [busy, setBusy] = useState<null | "business" | "brand" | "campaign" | "numbers" | "approve" | "reset">(null);

  // Resume where the user left off; partial progress is saved per step.
  useEffect(() => {
    if (!reg || hydrated) return;
    const b = { ...(refs.business ?? {}), ...(refs.brand ?? {}) };
    setLegal(b.legal_name ?? "");
    setEin(b.ein ?? "");
    setWebsite(b.website ?? "");
    setEmail(b.contact_email ?? "");
    setAddress((refs.business?.address as string | undefined) ?? "");
    setUseCase(refs.campaign?.use_case ?? "Lead follow-up & appointment setting");
    setSamples((refs.campaign?.sample_messages ?? [
      "Hi {{first_name}}, saw your property listed — 2 quick questions?",
      "Reply STOP to opt out.",
    ]).join("\n"));
    setOptIn(refs.campaign?.opt_in_flow ?? "Lead provided phone via public record / opt-in form. STOP + HELP honored.");
    setStep(refs.wizard_step ?? 1);
    setHydrated(true);
  }, [reg, hydrated, refs]);

  if (!workspaceId) return null;

  const numbers = numbersData?.rows ?? [];
  const brandApproved = reg?.brand_status === "approved";
  const campaignApproved = reg?.campaign_status === "approved";
  const brandSubmitted = !!reg?.brand_status && reg.brand_status !== "pending";
  const campaignSubmitted = !!reg?.campaign_status && reg.campaign_status !== "pending";
  const businessDone = !!(legal && ein && website && email);

  const stepDone = (id: number) =>
    id === 1 ? businessDone
      : id === 2 ? brandSubmitted
      : id === 3 ? campaignSubmitted
      : id === 4 ? numbers.length > 0
      : campaignApproved;

  const goto = async (next: number) => {
    setStep(next);
    try { await advance({ data: { workspaceId, wizard_step: next } }); } catch { /* progress is best-effort */ }
  };

  const saveBusiness = async () => {
    setBusy("business");
    try {
      await advance({
        data: {
          workspaceId,
          business: { legal_name: legal, ein, website, contact_email: email, address },
          wizard_step: 2,
        },
      });
      toast.success("Business Info Saved.");
      qc.invalidateQueries({ queryKey: ["registration", workspaceId] });
      setStep(2);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally { setBusy(null); }
  };

  const submitBrand = async () => {
    setBusy("brand");
    try {
      const r = await submitBrandFn({ data: { workspaceId, brand: { legal_name: legal, ein, website, contact_email: email } } });
      toast.success(r.providerId ? `Brand Submitted (${r.status}).` : "Brand Saved. Provider Not Configured.");
      qc.invalidateQueries({ queryKey: ["registration", workspaceId] });
      await goto(3);
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
          campaign: { use_case: useCase, sample_messages: samples.split("\n").filter(Boolean), opt_in_flow: optIn },
        },
      });
      toast.success(r.providerId ? `Campaign Submitted (${r.status}).` : "Campaign Saved. Provider Not Configured.");
      qc.invalidateQueries({ queryKey: ["registration", workspaceId] });
      await goto(4);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally { setBusy(null); }
  };

  const buy = async () => {
    const qty = Math.max(1, Math.min(20, Number(quantity) || 0));
    const codes = areaCodes.split(/[,\s]+/).map((c) => c.trim()).filter((c) => /^\d{3}$/.test(c));
    setBusy("numbers");
    try {
      await buyFn({ data: { workspaceId, region: "east", quantity: qty, ...(codes.length ? { areaCodes: codes } : {}) } });
      toast.success(`${qty} Numbers Added To Your Pool.`);
      qc.invalidateQueries({ queryKey: ["numbers", workspaceId] });
      await goto(5);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally { setBusy(null); }
  };

  const setStatuses = async (kind: "approve" | "reset") => {
    setBusy(kind);
    const value = kind === "approve" ? "approved" : "pending";
    try {
      await advance({ data: { workspaceId, brand_status: value, campaign_status: value } });
      toast.success(kind === "approve" ? "Approved. Sending Is Now Unlocked." : "Registration Reset.");
      qc.invalidateQueries({ queryKey: ["registration", workspaceId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally { setBusy(null); }
  };

  const completed = STEPS.filter((s) => stepDone(s.id)).length;

  return (
    <div>
      <AccountTabs current="registration" />
      <div className="flex flex-col gap-3 mb-8">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">Brand & SMS Setup</h1>
          <div className="flex items-center gap-2 shrink-0">
            <StatusPill label="Brand" value={reg?.brand_status} />
            <StatusPill label="Campaign" value={reg?.campaign_status} />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Carrier Approval Takes A Few Days — Start Now So It's Ready When Your List Is. Registration Fees Are $0 On Every Plan.
        </p>
      </div>

      <div className="grid lg:grid-cols-[260px_1fr] gap-6">
        <aside className="space-y-3">
          <div className="rounded-2xl border border-border bg-background p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Progress</span>
              <span className="text-xs text-muted-foreground">{completed} Of 5</span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${(completed / 5) * 100}%` }} />
            </div>
          </div>
          <nav className="space-y-1">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const active = step === s.id;
              const done = stepDone(s.id);
              return (
                <button
                  key={s.id}
                  onClick={() => goto(s.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                    active ? "bg-primary/10 text-foreground font-medium" : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                    done ? "border-success/30 bg-success/10 text-success" : active ? "border-primary/30 bg-background text-primary" : "border-border"
                  }`}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
              );
            })}
          </nav>
          <p className="px-3 text-xs text-muted-foreground">Your Progress Saves As You Go — Leave And Come Back Anytime.</p>
        </aside>

        <div>
          {step === 1 && (
            <Card>
              <CardHeader><CardTitle className="text-base font-display">Step 1 · Business Info</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Carriers Verify These Details Against Public Records. Match Them To Your Legal Filings Exactly.</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Legal Business Name</Label><Input value={legal} onChange={(e) => setLegal(e.target.value)} /></div>
                  <div><Label>EIN</Label><Input value={ein} onChange={(e) => setEin(e.target.value)} placeholder="12-3456789" /></div>
                  <div><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" /></div>
                  <div><Label>Contact Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                </div>
                <div><Label>Business Address</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, State ZIP" /></div>
                <div className="flex justify-end">
                  <Button className="rounded-full" onClick={saveBusiness} disabled={busy === "business" || !businessDone}>
                    {busy === "business" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                    Save & Continue <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardHeader><CardTitle className="text-base font-display">Step 2 · Brand Registration</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  We Submit Your Brand To The Carrier Registry Under The Hood. Approval Usually Lands In 1–3 Business Days — We Email You When It Does.
                </p>
                <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Legal Name</span><span className="font-medium">{legal || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">EIN</span><span className="font-medium">{ein || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Website</span><span className="font-medium">{website || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Contact</span><span className="font-medium">{email || "—"}</span></div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" className="rounded-full" onClick={() => goto(1)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
                  <div className="flex items-center gap-2">
                    {brandSubmitted && <Button variant="outline" className="rounded-full" onClick={() => goto(3)}>Continue</Button>}
                    <Button className="rounded-full" onClick={submitBrand} disabled={busy === "brand" || brandApproved || !businessDone}>
                      {busy === "brand" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                      {brandApproved ? "Brand Approved" : brandSubmitted ? "Resubmit Brand" : "Submit Brand"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card>
              <CardHeader><CardTitle className="text-base font-display">Step 3 · Campaign Use Case</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">Describe What You Send And How People End Up On Your List. Every Message We Send Appends "Reply STOP To Opt Out" Automatically.</p>
                <div><Label>Use Case</Label><Input value={useCase} onChange={(e) => setUseCase(e.target.value)} /></div>
                <div><Label>Sample Messages (One Per Line)</Label><Textarea rows={4} value={samples} onChange={(e) => setSamples(e.target.value)} /></div>
                <div><Label>Opt-In Description</Label><Textarea rows={3} value={optIn} onChange={(e) => setOptIn(e.target.value)} /></div>
                <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" className="rounded-full" onClick={() => goto(2)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
                  <div className="flex items-center gap-2">
                    {campaignSubmitted && <Button variant="outline" className="rounded-full" onClick={() => goto(4)}>Continue</Button>}
                    <Button className="rounded-full" onClick={submitCampaign} disabled={busy === "campaign" || campaignApproved}>
                      {busy === "campaign" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                      {campaignApproved ? "Campaign Approved" : campaignSubmitted ? "Resubmit Campaign" : "Submit Campaign"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card>
              <CardHeader><CardTitle className="text-base font-display">Step 4 · Sending Numbers</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Campaigns Rotate Across A Pool So No Single Number Carries The Volume. We Monitor Health And Cool Down Numbers Automatically.
                </p>
                <div className="rounded-xl border border-border bg-muted/40 p-4 flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Numbers In Your Pool</span>
                  <Badge variant="secondary">{numbers.length}</Badge>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Quantity</Label>
                    <Input value={quantity} onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))} placeholder="5" />
                  </div>
                  <div>
                    <Label>Preferred Area Codes (Optional)</Label>
                    <Input value={areaCodes} onChange={(e) => setAreaCodes(e.target.value)} placeholder="813, 727, 941" />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" className="rounded-full" onClick={() => goto(3)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" className="rounded-full"><Link to="/app/numbers">Manage Pool</Link></Button>
                    <Button className="rounded-full" onClick={buy} disabled={busy === "numbers"}>
                      {busy === "numbers" && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                      Add Numbers
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {step === 5 && (
            <Card>
              <CardHeader><CardTitle className="text-base font-display">Step 5 · Status & Next Steps</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {campaignApproved ? (
                  <div className="rounded-2xl border border-success/30 bg-success/5 p-4 flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-success" />
                    <div className="font-display font-bold text-foreground">Registration Approved — Sending Is Unlocked.</div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-warn/30 bg-warn/5 p-4 flex items-start gap-3">
                    <Clock className="h-5 w-5 text-warn mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      Pending Carrier Approval. Nothing Else Is Blocked — Keep Building Lists And Drafting Campaigns.
                      We'll Email You The Moment Your Brand Clears, And Sending Unlocks Automatically.
                    </div>
                  </div>
                )}
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-xl border border-border p-3"><div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Brand</div>{reg?.brand_status ?? "pending"}</div>
                  <div className="rounded-xl border border-border p-3"><div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Campaign</div>{reg?.campaign_status ?? "pending"}</div>
                  <div className="rounded-xl border border-border p-3"><div className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Numbers</div>{numbers.length}</div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Button variant="ghost" className="rounded-full" onClick={() => goto(4)}><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="rounded-full" onClick={() => setStatuses(campaignApproved ? "reset" : "approve")} disabled={busy === "approve" || busy === "reset"}>
                      {(busy === "approve" || busy === "reset") ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
                      {campaignApproved ? "Reset (Demo)" : "Simulate Approval (Demo)"}
                    </Button>
                    <Button asChild className="rounded-full"><Link to="/app/campaigns/new">Build A Campaign <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
