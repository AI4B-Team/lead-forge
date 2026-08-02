import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  Lock,
  Bell,
  CreditCard,
  Users,
  Building2,
  Smartphone,
  BadgeCheck,
  ShieldCheck,
  Settings2,
  Plug,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import { meIsSuperAdmin } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export type AccountTabKey =
  | "profile"
  | "security"
  | "notifications"
  | "billing"
  | "team"
  | "workspace"
  | "numbers"
  | "registration"
  | "integrations"
  | "api"
  | "compliance"
  | "admin";

type TabDef = {
  key: AccountTabKey;
  label: string;
  icon: LucideIcon;
  to: "/app/account" | "/app/billing" | "/app/team" | "/app/settings" | "/app/registration" | "/app/compliance" | "/app/numbers" | "/app/integrations" | "/app/api" | "/app/admin";
  search?: { tab: "profile" | "security" | "notifications" };
};

const TABS: TabDef[] = [
  { key: "profile", label: "Profile", icon: User, to: "/app/account", search: { tab: "profile" } },
  { key: "security", label: "Security", icon: Lock, to: "/app/account", search: { tab: "security" } },
  { key: "notifications", label: "Notifications", icon: Bell, to: "/app/account", search: { tab: "notifications" } },
  { key: "billing", label: "Billing", icon: CreditCard, to: "/app/billing" },
  { key: "workspace", label: "Workspace", icon: Building2, to: "/app/settings" },
  { key: "numbers", label: "Numbers", icon: Smartphone, to: "/app/numbers" },
  { key: "registration", label: "10DLC", icon: BadgeCheck, to: "/app/registration" },
  { key: "compliance", label: "Compliance", icon: ShieldCheck, to: "/app/compliance" },
  { key: "team", label: "Team", icon: Users, to: "/app/team" },
  { key: "integrations", label: "Integrations", icon: Plug, to: "/app/integrations" },
  { key: "api", label: "API", icon: KeyRound, to: "/app/api" },
];

export function AccountTabs({ current }: { current: AccountTabKey }) {
  const fetchIsAdmin = useServerFn(meIsSuperAdmin);
  const { data: admin } = useQuery({
    queryKey: ["me-is-super-admin"],
    queryFn: () => fetchIsAdmin(),
  });

  const items: TabDef[] = [
    ...TABS,
    ...(admin?.isSuperAdmin
      ? [{ key: "admin" as const, label: "Admin", icon: Settings2, to: "/app/admin" as const }]
      : []),
  ];

  return (
    <div
      role="tablist"
      className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-5"
    >
      {items.map((t) => {
        const active = t.key === current;
        const Icon = t.icon;
        return (
          <Link
            key={t.key}
            to={t.to}
            {...(t.search ? { search: t.search } : {})}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all",
              active
                ? "border-primary bg-primary text-primary-foreground shadow-sm"
                : "border-border bg-card text-muted-foreground hover:border-foreground/20 hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}