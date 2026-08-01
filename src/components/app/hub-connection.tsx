import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link2, Link2Off, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { connectHub, disconnectHub, getHubLink } from "@/lib/hub.functions";

/** Real Elite account linking (spec §16) — additive, never required. */
export function HubConnection() {
  const { workspaceId } = useWorkspaceId();
  const qc = useQueryClient();
  const load = useServerFn(getHubLink);
  const connect = useServerFn(connectHub);
  const disconnect = useServerFn(disconnectHub);
  const [token, setToken] = useState("");

  const { data } = useQuery({
    queryKey: ["hub-link", workspaceId],
    enabled: Boolean(workspaceId),
    queryFn: () => load({ data: { workspaceId: workspaceId! } }),
  });

  const linkMutation = useMutation({
    mutationFn: () => connect({ data: { workspaceId: workspaceId!, token: token.trim() } }),
    onSuccess: () => {
      setToken("");
      toast.success("Connected To Real Elite");
      qc.invalidateQueries({ queryKey: ["hub-link", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const unlinkMutation = useMutation({
    mutationFn: () => disconnect({ data: { workspaceId: workspaceId! } }),
    onSuccess: () => {
      toast.success("Disconnected From Real Elite");
      qc.invalidateQueries({ queryKey: ["hub-link", workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Link2 className="h-4 w-4 text-primary" />
          Real Elite Connection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Status</span>
          <Badge
            variant="outline"
            className={data?.linked ? "border-success/30 text-success" : "text-muted-foreground"}
          >
            {data?.linked ? "Connected" : "Not Connected"}
          </Badge>
        </div>
        <ul className="space-y-1.5 text-sm text-muted-foreground">
          {["Shared Login Across The Suite", "Shared Contacts And Lists", "Shared Automations And Events"].map((b) => (
            <li key={b} className="flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> {b}
            </li>
          ))}
        </ul>
        {data?.linked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Linked To Real Elite Organization
            </div>
            <div className="rounded-lg border border-border bg-surface p-3 text-xs text-muted-foreground">
              <div className="font-mono text-foreground">{data.realEliteOrgId}</div>
              {data.linkedAt ? <div className="mt-1">Linked {new Date(data.linkedAt).toLocaleDateString()}</div> : null}
              <p className="mt-2">
                Events from this workspace now carry your Real Elite organization ID, so the hub can
                resolve them without any data migration.
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => unlinkMutation.mutate()}
              disabled={unlinkMutation.isPending}
            >
              <Link2Off className="mr-2 h-4 w-4" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect this workspace to your Real Elite hub. Open LeadTrace from the Real Elite tile
              to link automatically, or paste a connection token below. Linking is optional — your
              standalone login keeps working either way.
            </p>
            <div>
              <Label htmlFor="hub-token">Connection Token</Label>
              <Input
                id="hub-token"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Paste the token from Real Elite"
                className="mt-1 font-mono text-xs"
              />
            </div>
            <Button
              className="rounded-full"
              onClick={() => linkMutation.mutate()}
              disabled={token.trim().length < 20 || linkMutation.isPending}
            >
              Connect To Real Elite
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
