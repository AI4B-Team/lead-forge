import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { meIsSuperAdmin } from "@/lib/admin.functions";

export type AccountTabKey =
  | "profile"
  | "security"
  | "billing"
  | "team"
  | "workspace"
  | "registration"
  | "compliance"
  | "admin";

const ROUTE_MAP: Record<AccountTabKey, string> = {
  profile: "/app/account",
  security: "/app/account",
  billing: "/app/billing",
  team: "/app/team",
  workspace: "/app/settings",
  registration: "/app/registration",
  compliance: "/app/compliance",
  admin: "/app/admin",
};

export function AccountTabs({ current }: { current: AccountTabKey }) {
  const navigate = useNavigate();
  const fetchIsAdmin = useServerFn(meIsSuperAdmin);
  const { data: admin } = useQuery({
    queryKey: ["me-is-super-admin"],
    queryFn: () => fetchIsAdmin(),
  });

  return (
    <Tabs
      value={current}
      onValueChange={(v) => {
        const key = v as AccountTabKey;
        if (key === "profile" || key === "security") {
          navigate({ to: "/app/account", search: { tab: key }, replace: true });
          return;
        }
        navigate({ to: ROUTE_MAP[key] });
      }}
      className="mb-4"
    >
      <TabsList className="flex flex-wrap h-auto justify-start">
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="security">Security</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsTrigger value="team">Team</TabsTrigger>
        <TabsTrigger value="workspace">Workspace</TabsTrigger>
        <TabsTrigger value="registration">10DLC</TabsTrigger>
        <TabsTrigger value="compliance">Compliance</TabsTrigger>
        {admin?.isSuperAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
      </TabsList>
    </Tabs>
  );
}