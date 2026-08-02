import { createFileRoute } from "@tanstack/react-router";
import { KeyRound, Webhook, Terminal, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { SettingsShell } from "@/components/app/settings-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebhookEndpoints } from "@/components/app/webhook-endpoints";

export const Route = createFileRoute("/_authenticated/app/api")({
  head: () => ({
    meta: [
      { title: "API — LeadTrace" },
      { name: "description", content: "Build directly against LeadTrace with API keys and event webhooks." },
      { property: "og:title", content: "API — LeadTrace" },
      { property: "og:description", content: "Build directly against LeadTrace with API keys and event webhooks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ApiPage,
});

function ApiPage() {
  return (
    <div className="mx-auto max-w-[1400px]">
      <SettingsShell current="api">
        <PageHeader title="API" description="Build Directly Against LeadTrace." />

        <div className="space-y-8">
          <section id="keys" className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-display text-base font-bold text-foreground">API Keys</h2>
              <p className="text-xs text-muted-foreground">Authenticate Requests From Your Own Stack.</p>
            </div>

            <Card className="mt-3">
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="flex items-center gap-2 text-base font-display">
                  <KeyRound className="h-4 w-4 text-primary" /> Workspace Keys
                </CardTitle>
                <Badge variant="outline" className="text-muted-foreground">Coming Soon</Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-4">
                <p className="max-w-xl text-sm text-muted-foreground">
                  Scoped, Revocable Keys For Reading Leads And Triggering Runs. Until Keys Ship,
                  Webhooks Below Cover Most Custom Handoffs.
                </p>
                <Button variant="outline" size="sm" className="rounded-full" disabled>
                  Create Key
                </Button>
              </CardContent>
            </Card>
          </section>

          <section id="webhooks" className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-display text-base font-bold text-foreground">Event Webhooks</h2>
              <p className="text-xs text-muted-foreground">Push List, Lead, And Reply Events To Any Endpoint.</p>
            </div>
            <div className="mt-3">
              <WebhookEndpoints />
            </div>
          </section>

          <section id="docs" className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-display text-base font-bold text-foreground">Reference</h2>
              <p className="text-xs text-muted-foreground">Payload Shapes And Delivery Rules.</p>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-display">
                    <Webhook className="h-4 w-4 text-muted-foreground" /> Event Payloads
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  Every Delivery Is Signed And Retried With Backoff. Events Cover List Completion,
                  New Clean Leads, And Inbound Replies.
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm font-display">
                    <BookOpen className="h-4 w-4 text-muted-foreground" /> Guides
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <Terminal className="h-3.5 w-3.5" /> Full API Docs Land With Public Keys.
                  </span>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </SettingsShell>
    </div>
  );
}