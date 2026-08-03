import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ScanEye, ChevronDown } from "lucide-react";
import { MarketingLayout } from "@/components/marketing/marketing-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  SCAN_PRESETS, SCAN_VERTICALS, SCAN_TIERS, previewFunnel, DEFAULT_BUY_BOX,
  PARCELS_PER_ZIP, scanCreditQuote,
} from "@/lib/property-scan.shared";

export const Route = createFileRoute("/ai-driving-for-dollars")({
  head: () => ({
    meta: [
      { title: "AI Driving For Dollars — Scan Any Market For Distressed Homes" },
      {
        name: "description",
        content:
          "Scan an entire market for visibly distressed properties in minutes. Scored, confirmed against county records, enriched and skip traced. Free scan of your first ZIP.",
      },
      { property: "og:title", content: "AI Driving For Dollars — Property Scan by LeadTrace" },
      {
        property: "og:description",
        content:
          "Every rundown house in your market, found overnight — scored on street-level imagery and confirmed against county records.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AiDrivingForDollars,
});

const FUNNEL = previewFunnel(PARCELS_PER_ZIP, DEFAULT_BUY_BOX);

const SAMPLE = [
  {
    address: "3708 E Wilder Ave",
    why: "Roof covering failed at ridge, tarped. Gutters detached. Yard overgrown to porch line.",
    tags: ["TARP", "OVERGROWN"],
    note: "absentee · 21 yrs",
    score: 94,
  },
  {
    address: "1142 N Alameda St",
    why: "Two front openings boarded. Exterior paint failed across south elevation. Driveway cracked.",
    tags: ["BOARDED"],
    note: "no permits 30 yrs · 100% equity",
    score: 91,
  },
  {
    address: "906 W Frierson Ave",
    why: "Fascia rot along eaves. Junk vehicles in side yard. Fence collapsed at rear boundary.",
    tags: ["JUNK VEHICLES"],
    note: "code violation, open",
    score: 88,
  },
];

const STEPS = [
  {
    idx: "Step 01",
    title: "Your Buy Box Runs First",
    body: "Ownership, tenure, equity, age and distress filters apply before a single image is fetched. You never pay to score houses you'd never buy.",
  },
  {
    idx: "Step 02",
    title: "AI Reads What's Left",
    body: "Sixteen condition elements plus visible detections — tarps, boarded openings, junk vehicles, green pools — each with a one-line reason and a confidence figure.",
  },
  {
    idx: "Step 03",
    title: "County Records Confirm It",
    body: "Permits, sales, violations and tax filings dated after the photo decide whether the condition we scored is still true today.",
  },
];

const COMPARE: Array<[string, string, string]> = [
  ["\u201CI don't know how old the photo is.\u201D", "Whatever imagery exists, undated", "18-month cap, capture date on every lead"],
  ["\u201CHalf my list was already renovated.\u201D", "Nothing checked after the photo", "Permits and sales verified since capture"],
  ["\u201CI paid for houses that couldn't be scored.\u201D", "Charged for every parcel analyzed", "Refunded automatically, every time"],
  ["\u201CI'm scanning 400,000 houses I'd never buy.\u201D", "Scores everything, filters afterward", "Your buy box runs before any imagery"],
  ["\u201CSkip tracing costs more than the list did.\u201D", "Separate purchase, priced per contact", "Included in your plan"],
  ["\u201CMy texts are landing on landlines.\u201D", "Your problem to sort out", "Landlines removed, DNC and litigators scrubbed"],
  ["\u201CEvery feature has another fee attached.\u201D", "$0.02–$0.04 per property on top", "One credit pool, everything comes out of it"],
];

const STANDING = [
  ["01", "Pick Your Farm Area Once", "Name the ZIPs and counties you work. Set it and leave it."],
  ["02", "New Matches Arrive Automatically", "Fresh imagery, new violations, new filings — anything crossing your threshold lands in your list."],
  ["03", "Get Told When A House Gets Worse", "A tarp appears. A yard goes to overgrowth. Condition drops sharply. You hear about it first."],
  ["04", "Enriched And Scrubbed On Arrival", "Owner data, contacts, landline removal and DNC scrubbing already done before you open it."],
];

const PLANS = [
  { tier: "starter" as const, price: "$49", features: ["Area and list scanning", "Investor buy box", "Skip tracing included", "DNC and litigator scrubbing", "1 seat"] },
  { tier: "growth" as const, price: "$149", features: ["Everything in Starter", "All trade buy boxes", "Standing scans and change alerts", "Example-property matching", "5 concurrent jobs · 3 seats"] },
  { tier: "pro" as const, price: "$399", features: ["Everything in Growth", "Insurance vertical", "API access", "White-label export", "10 concurrent jobs · 10 seats"] },
];

const FAQS: Array<[string, string]> = [
  [
    "How Is This Different From The AI Driving-For-Dollars Tools Already Out There?",
    "Two things. We filter on ownership and financial data before scoring, so you're not paying to score 400,000 houses that were never going to fit your buy box. And we check county permits, sales and violations dated after the photo was taken, which tells you whether the condition we scored is still true. Every lead carries an image date and a confidence figure. Most tools show you neither.",
  ],
  [
    "How Old Is The Imagery?",
    "We cap it at 18 months by default and show the capture date on every single lead. You can opt into older imagery if you want more volume, but it's your choice and it's labelled.",
  ],
  [
    "What Happens If A Property Can't Be Scanned?",
    "You're not charged. No imagery available, view blocked by a tree or a parked truck, address doesn't resolve, or the house is mid-renovation — all refunded automatically. A house with a dumpster out front isn't a lead, so we don't sell it to you as one.",
  ],
  [
    "Do I Get Contact Details, Or Just Addresses?",
    "Contacts. Owner records, phone numbers and emails, with landlines separated out and DNC and known-litigator numbers scrubbed before anything reaches your campaign. Skip tracing comes out of the same credit pool as everything else.",
  ],
  [
    "Can I Score A List I Already Have?",
    "Yes, and it's the fastest way to see whether this works for you. Upload a CSV or point at a list you've already built in LeadTrace, and every row comes back with a condition score and reasoning.",
  ],
  [
    "Which Markets Do You Cover?",
    "All 50 states. Coverage and image freshness vary by area — mostly a rural-versus-urban difference — and the scan tells you the coverage rate for your ZIP before you spend anything.",
  ],
];

function AiDrivingForDollars() {
  const [zip, setZip] = useState("33610");

  return (
    <MarketingLayout>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
              AI Driving For Dollars
            </span>
            <h1 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight text-foreground md:text-5xl">
              Every Rundown House In Your Market. Found Overnight.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Property Scan reads street-level imagery across an entire market, scores what it sees,
              then checks county records to confirm the house is still in that condition. You get a
              ranked, skip-traced list — not a pile of addresses to go verify yourself.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/start">Scan Your First ZIP Free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/how-it-works">See How It Works</Link>
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              {["25 scored leads, no card", "All 50 states", "Results in minutes"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" strokeWidth={3} />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          {/* Console */}
          <div className="overflow-hidden rounded-2xl border border-border bg-surface-muted/50">
            <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
              <ScanEye className="h-4 w-4 text-primary" />
              <span className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                property scan · live
              </span>
            </div>
            <div className="p-4">
              <div className="flex gap-2">
                <Input
                  value={zip}
                  onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
                  inputMode="numeric"
                  aria-label="ZIP Code"
                  className="font-mono"
                />
                <Button asChild>
                  <Link to="/start">Run Scan</Link>
                </Button>
              </div>

              <dl className="mt-4 divide-y divide-border">
                {[
                  ["Parcels In Area", FUNNEL.parcelsInArea],
                  ["Passing Your Buy Box", FUNNEL.scanned],
                  ["Scored On Imagery", FUNNEL.scanned],
                  ["Confirmed Against County Records", Math.round(FUNNEL.scanned * 0.92)],
                ].map(([label, value]) => (
                  <div key={String(label)} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                    <dt className="flex items-center gap-2 text-muted-foreground">
                      <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                      {label}
                    </dt>
                    <dd className="font-mono text-foreground">{Number(value).toLocaleString()}</dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-3 py-2 text-sm">
                  <dt className="flex items-center gap-2 font-semibold text-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" strokeWidth={3} />
                    Matched Your Criteria
                  </dt>
                  <dd className="font-mono font-bold text-primary">187</dd>
                </div>
              </dl>

              <div className="mt-4 space-y-3">
                {SAMPLE.map((r) => (
                  <div key={r.address} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
                    <div className="mt-0.5 h-11 w-14 shrink-0 rounded-md bg-surface-muted" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm font-bold text-foreground">{r.address}</div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{r.why}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {r.tags.map((t) => (
                          <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
                            {t}
                          </span>
                        ))}
                        <span className="text-[11px] text-muted-foreground">{r.note}</span>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-display text-lg font-bold text-foreground">{r.score}</div>
                      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Score</div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Sample output. Your free scan of {zip || "your ZIP"} returns 25 leads with full condition
                detail, owner data and contacts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Wedge */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-4xl px-6 py-14 text-center">
          <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Everyone In Your Market Is Mailing The Same Absentee List. They Bought It From The Same
            Place You Did.
          </h2>
        </div>
      </section>

      {/* How it works */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">How It Works</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            Filter First. Look Second. Verify Third.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Most tools score every house in the county and hand you the wreckage. We cut the list down
            before spending a single image on it, then check our own answer.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.idx} className="rounded-2xl border border-border bg-surface p-5">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{s.idx}</span>
                <h3 className="mt-2 font-display text-base font-bold text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Presets */}
      <section className="border-b border-border bg-surface-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Scan Presets</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            Start From A Preset. Or Describe What You Want In Plain English.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Every preset is a starting point you can edit. Or skip them and just type what you're
            looking for — the scan reads it the same way you'd explain it to a driver.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SCAN_PRESETS.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="font-display text-sm font-bold text-foreground">{p.label}</div>
                <p className="mt-1.5 text-sm text-muted-foreground">{p.blurb}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compare */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Why It's Different</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            The Problem With AI D4D Lists Isn't The AI.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            It's that a house photographed in 2019 gets sold to you in 2026 as if nothing happened in
            between. Half the leads on a typical list are already fixed, already sold, or already
            someone else's deal.
          </p>
          <div className="mt-8 overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-surface-muted/60 text-left">
                <tr>
                  <th className="px-4 py-3 font-display font-bold text-foreground">What You've Run Into</th>
                  <th className="px-4 py-3 font-display font-bold text-muted-foreground">With Other Tools</th>
                  <th className="px-4 py-3 font-display font-bold text-primary">With Property Scan</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE.map(([problem, them, us]) => (
                  <tr key={problem} className="border-t border-border">
                    <td className="px-4 py-3 text-foreground">{problem}</td>
                    <td className="px-4 py-3 text-muted-foreground">{them}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Standing scans */}
      <section className="border-b border-border bg-surface-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Standing Scans</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            Set Your Buy Box Once. We Keep Scanning.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Conditions change. A roof that was fine last spring is tarped by autumn. Leave a scan
            running and new matches arrive on their own.
          </p>
          <ol className="mt-8 grid gap-4 md:grid-cols-2">
            {STANDING.map(([n, title, body]) => (
              <li key={n} className="flex gap-4 rounded-2xl border border-border bg-surface p-5">
                <span className="font-mono text-sm font-semibold text-primary">{n}</span>
                <div>
                  <div className="font-display text-sm font-bold text-foreground">{title}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Who it's for */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Who It's For</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            A House In Bad Shape Is A Lead. Whose Lead Depends On What's Wrong With It.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Same scan, different filter. Tell us what you sell and the list re-ranks around it.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SCAN_VERTICALS.map((v) => (
              <div key={v.id} className="rounded-2xl border border-border bg-surface p-5">
                <div className="font-display text-sm font-bold text-foreground">{v.label}</div>
                <div className="mt-1 font-mono text-[11px] text-primary">{v.signal}</div>
                <p className="mt-2 text-sm text-muted-foreground">{v.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="border-b border-border bg-surface-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Pricing</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            One Plan. Scanning, Enrichment, Skip Tracing And Sending All Included.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Everything runs off a single credit pool. Spend it however your month goes — no
            per-property scan fee stapled on top of your subscription.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PLANS.map((p, i) => {
              const tier = SCAN_TIERS[p.tier];
              return (
                <div
                  key={p.tier}
                  className={`relative rounded-2xl border p-6 ${
                    i === 1 ? "border-primary bg-surface" : "border-border bg-surface"
                  }`}
                >
                  {i === 1 ? (
                    <span className="absolute -top-2.5 left-6 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                      Most Popular
                    </span>
                  ) : null}
                  <div className="font-display text-sm font-bold text-foreground">{tier.label}</div>
                  <div className="mt-2 font-display text-3xl font-bold text-foreground">
                    {p.price}
                    <span className="text-sm font-normal text-muted-foreground">/mo</span>
                  </div>
                  <div className="mt-1 text-sm text-primary">
                    {tier.creditsPerMonth.toLocaleString()} Credits Included
                  </div>
                  <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
                      Up to {tier.maxParcelsPerJob.toLocaleString()} parcels per job
                    </li>
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={3} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-6 w-full" variant={i === 1 ? "default" : "outline"}>
                    <Link to="/start">Start Free</Link>
                  </Button>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            A typical ZIP scans for about {scanCreditQuote(FUNNEL.scanned, 3).toLocaleString()} credits
            with three images per property. Anything we can't score is refunded automatically.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Questions</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground">
            Straight Answers.
          </h2>
          <div className="mt-8 divide-y divide-border">
            {FAQS.map(([q, a], i) => (
              <details key={q} open={i === 0} className="group py-4">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-display text-base font-bold text-foreground">
                  {q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-surface-muted/40">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Pick A ZIP. See What's Actually There.
          </h2>
          <p className="mt-3 text-muted-foreground">
            25 scored leads with condition detail, owner records and contacts. Takes a few minutes and
            costs nothing.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link to="/start">Scan Your First ZIP Free</Link>
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">No credit card. No demo call. No sales sequence.</p>
        </div>
      </section>
    </MarketingLayout>
  );
}