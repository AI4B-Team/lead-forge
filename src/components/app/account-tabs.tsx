import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { meIsSuperAdmin } from "@/lib/admin.functions";
import { cn } from "@/lib/utils";

export type AccountTabKey =
  | "profile"
  | "security"
  | "billing"
  | "team"
  | "workspace"
  | "numbers"
  | "registration"
  | "compliance"
  | "admin";

type TabDef = {
  key: AccountTabKey;
  label: string;
  to: "/app/account" | "/app/billing" | "/app/team" | "/app/settings" | "/app/registration" | "/app/compliance" | "/app/numbers" | "/app/admin";
  search?: { tab: "profile" | "security" };
};

const TABS: TabDef[] = [
  { key: "profile", label: "Profile", to: "/app/account", search: { tab: "profile" } },
  { key: "security", label: "Security", to: "/app/account", search: { tab: "security" } },
  { key: "billing", label: "Billing", to: "/app/billing" },
  { key: "team", label: "Team", to: "/app/team" },
  { key: "workspace", label: "Workspace", to: "/app/settings" },
  { key: "numbers", label: "Numbers", to: "/app/numbers" },
  { key: "registration", label: "10DLC", to: "/app/registration" },
  { key: "compliance", label: "Compliance", to: "/app/compliance" },
];

export function AccountTabs({ current }: { current: AccountTabKey }) {
  const fetchIsAdmin = useServerFn(meIsSuperAdmin);
  const { data: admin } = useQuery({
    queryKey: ["me-is-super-admin"],
    queryFn: () => fetchIsAdmin(),
  });

  const items: TabDef[] = [
    ...TABS,
    ...(admin?.isSuperAdmin ? [{ key: "admin" as const, label: "Admin", to: "/app/admin" as const }] : []),
  ];

  return (
    <div
      role="tablist"
      className="mb-4 inline-flex flex-wrap items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground"
    >
      {items.map((t) => {
        const active = t.key === current;
        return (
          <Link
            key={t.key}
            to={t.to}
            {...(t.search ? { search: t.search } : {})}
            role="tab"
            aria-selected={active}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all",
              active
                ? "bg-background text-foreground shadow-sm"
                : "hover:text-foreground"
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}