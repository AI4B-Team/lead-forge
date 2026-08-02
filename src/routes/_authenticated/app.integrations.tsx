import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  Webhook, Zap, Link2, Sheet, Mail, Plug, ChevronDown, KeyRound, BookOpen, Terminal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { SettingsShell } from "@/components/app/settings-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { HubConnection } from "@/components/app/hub-connection";
import { WebhookEndpoints } from "@/components/app/webhook-endpoints";
import { listWebhooks } from "@/lib/monitoring.functions";
import { getHubLink } from "@/lib/hub.functions";

export const Route = createFileRoute("/_authenticated/app/integrations")({
  head: () => ({
    meta: [
      { title: "Integrations — LeadTrace" },
      { name: "description", content: "Connect LeadTrace to webhooks, the Real Elite suite, and the rest of your stack." },
      { property: "og:title", content: "Integrations — LeadTrace" },
      { property: "og:description", content: "Connect LeadTrace to webhooks, the Real Elite suite, and the rest of your stack." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: IntegrationsPage,
});

type Status = "connected" | "not_connected" | "soon";

type Connector = {
  key: string;
  title: string;
  description: string;
  icon: LucideIcon;
  status: Status;
  detail?: "hub";
  href?: string;
};

function IntegrationsPage() {
  const { workspaceId } = useWorkspaceId();
  const fetchHooks = useServerFn(listWebhooks);
  const fetchHub = useServerFn(getHubLink);
  const [open, setOpen] = useState<string | null>(null);

  const { data: hooks } = useQuery({
    queryKey: ["webhooks", workspaceId],
    queryFn: () => fetchHooks({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const { data: hub } = useQuery({
    queryKey: ["hub-link", workspaceId],
    queryFn: () => fetchHub({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const hookCount = hooks?.rows?.length ?? 0;
  const hubConnected = Boolean(hub?.linked);

  const groups: { label: string; hint: string; items: Connector[] }[] = [
    {
      label: "Outbound",
      hint: "Push Lists, Leads, And Replies Out To Other Tools.",
      items: [
        {
          key: "webhooks",
          title: "Webhooks",
          description: "Push List, Lead, And Reply Events To Any Endpoint.",
          icon: Webhook,
          status: hookCount > 0 ? "connected" : "not_connected",
          href: "#developer",
        },
        {
          key: "zapier",
          title: "Zapier",
          description: "Route Leads Into 6,000+ Apps Without Code.",
          icon: Zap,
          status: "soon",
        },
        {
          key: "sheets",
          title: "Google Sheets",
          description: "Sync Clean Leads Into A Live Spreadsheet.",
          icon: Sheet,
          status: "soon",
        },
        {
          key: "email-tool",
          title: "Email Tool Handoff",
          description: "Send Verified Emails To Your Marketing Platform.",
          icon: Mail,
          status: "soon",
        },
      ],
    },
    {
      label: "Suite",
      hint: "Shared Account Across The Real Elite Products.",
      items: [
        {
          key: "hub",
          title: "Real Elite",
          description: "Shared Login, Contacts, And Automations Across The Suite.",
          icon: Link2,
          status: hubConnected ? "connected" : "not_connected",
          detail: "hub",
        },
      ],
    },
  ];

  return (
    <div className="mx-auto max-w-[1400px]">
      <SettingsShell current="integrations">
        <PageHeader
          title="Integrations"
          description="Connect LeadTrace To The Rest Of Your Stack."
        />

        <div className="space-y-8">
          {groups.map((g) => (
            <section key={g.label} id={g.label.toLowerCase()} className="scroll-mt-24">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className="font-display text-base font-bold text-foreground">{g.label}</h2>
                <p className="text-xs text-muted-foreground">{g.hint}</p>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {g.items.map((c) => (
                  <ConnectorCard
                    key={c.key}
                    connector={c}
                    expanded={open === c.key}
                    onToggle={() => setOpen(open === c.key ? null : c.key)}
                  />
                ))}
              </div>

              {g.items.some((c) => c.detail && open === c.key) && (
                <div className="mt-4">
                  {open === "hub" && <HubConnection />}
                </div>
              )}
            </section>
          ))}

          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Plug className="h-4 w-4 text-primary" /> Need Another Integration?
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Tell Us Which Tool You Want LeadTrace To Talk To And We'll Prioritize It.
              Webhooks Already Cover Most Custom Handoffs Today.
            </CardContent>
          </Card>

          <section id="developer" className="scroll-mt-24">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="font-display text-base font-bold text-foreground">Developer</h2>
              <p className="text-xs text-muted-foreground">API Keys, Event Webhooks, And Payload Reference.</p>
            </div>

            <Card className="mt-3">
              <CardHeader className="flex-row items-center justify-between gap-3 space-y-0">
                <CardTitle className="flex items-center gap-2 text-base font-display">
                  <KeyRound className="h-4 w-4 text-primary" /> API Keys
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

            <div className="mt-3">
              <WebhookEndpoints />
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

function ConnectorCard({
  connector, expanded, onToggle,
}: {
  connector: Connector;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = connector.icon;
  const soon = connector.status === "soon";
  const connected = connector.status === "connected";

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border bg-surface p-4 transition-colors",
        expanded ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <Badge
          variant="outline"
          className={cn(
            connected ? "border-success/30 text-success" : "text-muted-foreground",
          )}
        >
          {connected ? "Connected" : soon ? "Coming Soon" : "Not Connected"}
        </Badge>
      </div>

      <div className="mt-3 text-sm font-semibold text-foreground">{connector.title}</div>
      <p className="mt-1 flex-1 text-xs text-muted-foreground">{connector.description}</p>

      <div className="mt-3">
        {connector.href ? (
          <Button variant="outline" size="sm" className="rounded-full" asChild>
            <a href={connector.href}>{connected ? "Manage" : "Set Up"}</a>
          </Button>
        ) : connector.detail ? (
          <Button
            variant={expanded ? "secondary" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={onToggle}
            aria-expanded={expanded}
          >
            {connected ? "Manage" : "Connect"}
            <ChevronDown className={cn("ml-1 h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="rounded-full" disabled>
            Coming Soon
          </Button>
        )}
      </div>
    </div>
  );
}
