import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2, Home, Sun, Shield, Wrench, Briefcase, MoreHorizontal,
  Webhook, KeyRound, Zap, Link2, Check, Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { SettingsShell } from "@/components/app/settings-shell";
import { SettingsSummary } from "@/components/app/settings-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { INDUSTRIES } from "@/lib/mock-data";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { WebhookEndpoints } from "@/components/app/webhook-endpoints";
import { HubConnection } from "@/components/app/hub-connection";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Workspace Settings — LeadTrace" }] }),
  component: Settings,
});

const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  insurance: Shield,
  real_estate: Home,
  solar: Sun,
  home_services: Wrench,
  agency: Briefcase,
  other: MoreHorizontal,
};

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
];

const STATES = ["FL", "TX", "GA", "NC", "AZ", "CA", "OH", "PA"];

function Settings() {
  const { workspaceName } = useWorkspaceId();
  const [industry, setIndustry] = useState("real_estate");
  const [timezone, setTimezone] = useState("America/New_York");
  const [state, setState] = useState("FL");

  return (
    <div className="mx-auto max-w-[1400px]">
      <SettingsShell current="workspace">
      <PageHeader title="Workspace Settings" description="General Details, Industry Preset, And Connected Apps." />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          {/* General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Building2 className="h-4 w-4 text-primary" /> General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="ws-name">Workspace Name</Label>
                  <Input id="ws-name" key={workspaceName ?? "ws"} defaultValue={workspaceName ?? ""} className="mt-1" />
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((t) => <SelectItem key={t} value={t}>{t.replace("America/", "").replace("_", " ")}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Default State</Label>
                  <Select value={state} onValueChange={setState}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Industry Preset</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Tunes Templates, Message Tone, And Default Filters Across The Workspace.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {INDUSTRIES.map((i) => {
                    const Icon = INDUSTRY_ICONS[i.key] ?? MoreHorizontal;
                    const active = industry === i.key;
                    return (
                      <button
                        key={i.key}
                        type="button"
                        onClick={() => setIndustry(i.key)}
                        className={`rounded-xl border p-3 text-left transition-all ${
                          active
                            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                            : "border-border bg-surface hover:border-primary/40"
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="mt-2 text-sm font-semibold text-foreground">{i.label}</div>
                        <div className="mt-1 h-4 text-[11px] font-semibold uppercase tracking-wider text-primary">
                          {active && (
                            <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> Selected</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button className="rounded-full">Save Changes</Button>
            </CardContent>
          </Card>

          {/* Integrations */}
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">Integrations</h2>
            <p className="mt-1 text-sm text-muted-foreground">Connect LeadTrace To The Rest Of Your Stack.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <IntegrationCard
                icon={Webhook} title="Webhooks" connected
                description="Push Job, Lead, And Reply Events To Any Endpoint."
                action="Manage Below"
              />
              <IntegrationCard
                icon={Link2} title="Real Elite" connected={false}
                description="Shared Login, Contacts, And Automations Across The Suite."
                action="Connect Below"
              />
              <IntegrationCard
                icon={Zap} title="Zapier" connected={false}
                description="Route Leads Into 6,000+ Apps Without Code."
                action="Coming Soon"
              />
              <IntegrationCard
                icon={KeyRound} title="API Keys" connected={false}
                description="Build Directly Against The LeadTrace API."
                action="Coming Soon"
              />
            </div>
          </div>

          <WebhookEndpoints />
          <HubConnection />
        </div>

        <div className="space-y-4">
          <SettingsSummary ownerName={workspaceName ?? "Workspace"} />
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <Users className="h-4 w-4 text-primary" /> Team
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Invite Teammates, Assign Roles, And Track Seat Usage On The Team Tab.
              </p>
              <Button variant="outline" className="mt-3 w-full rounded-full" asChild>
                <a href="/app/team">Manage Team</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
      </SettingsShell>
    </div>
  );
}

function IntegrationCard({
  icon: Icon, title, description, connected, action,
}: {
  icon: LucideIcon; title: string; description: string; connected: boolean; action: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <Badge
          variant="outline"
          className={connected ? "border-success/30 text-success" : "text-muted-foreground"}
        >
          {connected ? "Connected" : "Not Connected"}
        </Badge>
      </div>
      <div className="mt-3 text-sm font-semibold text-foreground">{title}</div>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      <div className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{action}</div>
    </div>
  );
}
