import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { AccountTabs } from "@/components/app/account-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { INDUSTRIES } from "@/lib/mock-data";
import { useState } from "react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { WebhookEndpoints } from "@/components/app/webhook-endpoints";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Settings — LeadTrace" }] }),
  component: Settings,
});

function Settings() {
  const { workspaceName } = useWorkspaceId();
  const [industry, setIndustry] = useState("real_estate");
  return (
    <div className="max-w-3xl">
      <PageHeader title="Settings" description="Workspace, Industry Preset, And Team." />
      <AccountTabs current="workspace" />
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base font-display">Workspace</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="ws-name">Workspace Name</Label>
              <Input id="ws-name" key={workspaceName ?? "ws"} defaultValue={workspaceName ?? ""} className="mt-1" />
            </div>
            <div>
              <Label>Industry Preset</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {INDUSTRIES.map((i) => (
                  <button
                    key={i.key}
                    type="button"
                    onClick={() => setIndustry(i.key)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
                      industry === i.key
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-surface text-foreground border-border"
                    }`}
                  >
                    {i.label}
                  </button>
                ))}
              </div>
            </div>
            <Button className="rounded-full">Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base font-display">Team</CardTitle></CardHeader>
          <CardContent>
            <div className="divide-y divide-border">
              {[
                { name: "Jane Smith", email: "jane@acme.com", role: "Owner" },
                { name: "Mike Diaz", email: "mike@acme.com", role: "Admin" },
                { name: "Sara Kim", email: "sara@acme.com", role: "Member" },
              ].map((u) => (
                <div key={u.email} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-foreground">{u.name}</div>
                    <div className="text-xs text-muted-foreground">{u.email}</div>
                  </div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">{u.role}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="mt-4 rounded-full">Invite Teammate</Button>
          </CardContent>
        </Card>

        <WebhookEndpoints />
      </div>
    </div>
  );
}