import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Trash2, UserPlus, Mail } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { AccountTabs } from "@/components/app/account-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { listTeam, inviteTeamMember, revokeInvite, removeMember } from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/app/team")({
  head: () => ({ meta: [{ title: "Team — LeadTrace" }] }),
  component: TeamPage,
});

function TeamPage() {
  const { workspaceId } = useWorkspaceId();
  const qc = useQueryClient();
  const fetchList = useServerFn(listTeam);
  const doInvite = useServerFn(inviteTeamMember);
  const doRevoke = useServerFn(revokeInvite);
  const doRemove = useServerFn(removeMember);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["team", workspaceId],
    queryFn: () => fetchList({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["team", workspaceId] });

  const submitInvite = async () => {
    if (!workspaceId || !email) return;
    setBusy(true);
    try {
      const res = await doInvite({ data: { workspaceId, email, role } });
      const link = `${window.location.origin}/accept-invite?token=${res.token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success("Invite created — link copied to clipboard");
      setEmail("");
      invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to invite");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied");
  };

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Team" description="Invite Teammates To Collaborate In This Workspace." />
      <AccountTabs current="team" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-display flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Invite Teammate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-[1fr_180px_auto] gap-3 items-end">
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "member")}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="rounded-full" onClick={submitInvite} disabled={busy || !email}>
              {busy ? "Sending..." : "Send Invite"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            An invite link will be generated and copied to your clipboard. Share it with your teammate.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base font-display">Members</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data?.members ?? []).map((m) => (
            <div key={m.user_id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-3">
                <div className="grid place-items-center h-8 w-8 rounded-full bg-muted text-xs font-bold uppercase">
                  {m.email.slice(0, 2)}
                </div>
                <div>
                  <div className="text-sm font-medium">
                    {m.email || m.user_id.slice(0, 8)} {m.is_me && <span className="text-muted-foreground text-xs">(you)</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">Joined {new Date(m.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">{m.role}</Badge>
                {!m.is_me && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (!confirm(`Remove ${m.email}?`)) return;
                      try {
                        await doRemove({ data: { workspaceId: workspaceId!, userId: m.user_id } });
                        toast.success("Member removed");
                        invalidate();
                      } catch (e: any) {
                        toast.error(e?.message ?? "Failed");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
          {(data?.members?.length ?? 0) === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">No members yet.</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base font-display">Pending Invites</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {(data?.invites ?? []).map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between rounded-md border border-border px-3 py-2">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-sm font-medium">{inv.email}</div>
                  <div className="text-xs text-muted-foreground">
                    Expires {new Date(inv.expires_at).toLocaleDateString()} · <span className="capitalize">{inv.role}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full" onClick={() => copyLink(inv.token)}>
                  <Copy className="h-3.5 w-3.5 mr-1" /> Copy Link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    try {
                      await doRevoke({ data: { inviteId: inv.id } });
                      toast.success("Invite revoked");
                      invalidate();
                    } catch (e: any) {
                      toast.error(e?.message ?? "Failed");
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {(data?.invites?.length ?? 0) === 0 && (
            <div className="text-sm text-muted-foreground py-8 text-center">No pending invites.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}