import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, ShieldCheck, Gauge, Terminal, BookOpen, Code2 } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { SettingsShell } from "@/components/app/settings-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/app/api")({
  head: () => ({
    meta: [
      { title: "Developer & API — LeadTrace" },
      { name: "description", content: "Manage LeadTrace API keys, review rate limits, and browse endpoint and SDK references." },
      { property: "og:title", content: "Developer & API — LeadTrace" },
      { property: "og:description", content: "Manage LeadTrace API keys, review rate limits, and browse endpoint and SDK references." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DeveloperPage,
});

const ENDPOINTS = [
  { method: "GET", path: "/api/public/v1/leads", note: "List Clean Leads With Filters And Paging." },
  { method: "GET", path: "/api/public/v1/jobs", note: "List Runs And Their Pipeline Stages." },
  { method: "POST", path: "/api/public/v1/jobs", note: "Trigger A New List Run." },
  { method: "GET", path: "/api/public/v1/jobs/{jobId}", note: "Fetch A Single Run With Stage Counts." },
  { method: "GET", path: "/api/public/v1/campaigns", note: "List Campaigns And Delivery Totals." },
];

function DeveloperPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <SettingsShell current="developer">
        <PageHeader
          title="Developer & API"
          description="API Keys, Rate Limits, And Endpoint References For Building On LeadTrace."
        />

        <div className="max-w-4xl space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <KeyRound className="h-4 w-4 text-primary" /> API Keys
              </CardTitle>
              <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="max-w-xl text-sm text-muted-foreground">
                Scoped, Revocable Keys For Reading Leads And Triggering Runs. Keys Are Shown Once At
                Creation, Can Be Rotated Without Downtime, And Revoked Instantly.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" className="rounded-full" disabled>Create Key</Button>
                <Button size="sm" variant="outline" className="rounded-full" disabled>Rotate</Button>
                <Button size="sm" variant="outline" className="rounded-full" disabled>Revoke</Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Until Keys Ship, Event Webhooks On The Integrations Page Cover Most Custom Handoffs.
              </p>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-display">
                  <Gauge className="h-4 w-4 text-muted-foreground" /> Rate Limits
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <div>120 Requests Per Minute Per Key.</div>
                <div>10 Run Triggers Per Minute Per Workspace.</div>
                <div>429 Responses Include A Retry-After Header.</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-display">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" /> Authentication
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                Send Your Key As <code className="rounded bg-muted px-1 py-0.5">Authorization: Bearer &lt;token&gt;</code>.
                Requests Are Scoped To The Workspaces Your Key Belongs To.
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Code2 className="h-4 w-4 text-primary" /> Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="divide-y divide-border">
              {ENDPOINTS.map((e) => (
                <div key={`${e.method}-${e.path}`} className="flex flex-wrap items-center gap-3 py-2 first:pt-0 last:pb-0">
                  <Badge variant="outline" className="font-mono text-[10px]">{e.method}</Badge>
                  <code className="text-xs text-foreground">{e.path}</code>
                  <span className="text-xs text-muted-foreground">{e.note}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-display">
                  <Terminal className="h-4 w-4 text-muted-foreground" /> Quickstart
                </CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-[11px] leading-relaxed text-foreground">
{`curl -H "Authorization: Bearer $LEADTRACE_KEY" \\
  https://app.leadtrace.io/api/public/v1/leads`}
                </pre>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-display">
                  <BookOpen className="h-4 w-4 text-muted-foreground" /> SDKs & Docs
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                TypeScript And Python SDKs Land With Public Keys. Full Reference Docs Will Ship
                Alongside Them.
              </CardContent>
            </Card>
          </div>
        </div>
      </SettingsShell>
    </div>
  );
}
