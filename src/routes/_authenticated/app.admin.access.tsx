import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { SettingsShell } from "@/components/app/settings-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminGate, useSuperAdminGate } from "@/components/app/admin-shared";
import { listSuperAdmins, revokeSuperAdmin } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/app/admin/access")({
  head: () => ({
    meta: [
      { title: "Admin Access — LeadTrace Platform" },
      { name: "description", content: "Who holds super admin on the platform, and when it was granted." },
    ],
  }),
  component: AdminAccessPage,
});

function AdminAccessPage() {
  const qc = useQueryClient();
  const gate = useSuperAdminGate();
  const fetchAdmins = useServerFn(listSuperAdmins);
  const revoke = useServerFn(revokeSuperAdmin);
  const [busyId, setBusyId] = useState<string | null>(null);

  const adminsQ = useQuery({
    queryKey: ["admin-super-admins"],
    queryFn: () => fetchAdmins(),
    enabled: gate.data?.isSuperAdmin === true,
  });

  const revokeAdmin = async (userId: string) => {
    setBusyId(userId);
    try {
      await revoke({ data: { userId } });
      toast.success("Revoked.");
      qc.invalidateQueries({ queryKey: ["admin-super-admins"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1400px]">
      <SettingsShell current="admin-access">
        <AdminGate gate={gate}>
          <PageHeader
            title="Admin Access"
            description="Who Can Comp Accounts, Grant Credits, And See Every Workspace."
          />

          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base font-display">
                <ShieldAlert className="h-4 w-4 text-primary" /> Super Admins
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3 text-xs text-muted-foreground">
                Full Platform Access. Contact Support To Add A New Super Admin.
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Granted</TableHead>
                    <TableHead className="w-[100px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminsQ.isLoading && (
                    <TableRow>
                      <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                        <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading…
                      </TableCell>
                    </TableRow>
                  )}
                  {adminsQ.data?.admins.map((a) => (
                    <TableRow key={a.user_id}>
                      <TableCell className="font-medium">
                        {a.email} {a.is_me && <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {!a.is_me && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => revokeAdmin(a.user_id)}
                            disabled={busyId === a.user_id}
                            className="text-danger hover:bg-danger/10 hover:text-danger"
                          >
                            {busyId === a.user_id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </AdminGate>
      </SettingsShell>
    </div>
  );
}