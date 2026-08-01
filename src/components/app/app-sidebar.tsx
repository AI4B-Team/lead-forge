import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspaceId } from "@/hooks/use-workspace";
import {
  LayoutDashboard,
  Plus,
  ListChecks,
  MessageSquare,
  Radar,
  BarChart3,
  BrainCircuit,
  Sparkles,
  Users,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { BRAND_NAME } from "@/config/brand";

const ITEMS = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/app/new-job", label: "New Job", icon: Plus },
  { to: "/app/lists", label: "Jobs", icon: ListChecks },
  { to: "/app/leads", label: "Leads", icon: Users },
  { to: "/app/brands", label: "AI Brands", icon: BrainCircuit },
  { to: "/app/campaigns", label: "Campaigns", icon: MessageSquare },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
] as const;

type Counts = { lists: number; leads: number; campaigns: number };

export function AppSidebar() {
  const { state } = useSidebar();
  const { workspaceId } = useWorkspaceId();
  const [counts, setCounts] = useState<Counts>({ lists: 0, leads: 0, campaigns: 0 });

  useEffect(() => {
    if (!workspaceId) return;
    (async () => {
      const [lists, leads, campaigns] = await Promise.all([
        supabase.from("jobs").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
        supabase.from("campaigns").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
      ]);
      setCounts({ lists: lists.count ?? 0, leads: leads.count ?? 0, campaigns: campaigns.count ?? 0 });
    })();
  }, [workspaceId]);

  const badgeFor = (to: string) =>
    to === "/app/lists" ? counts.lists
    : to === "/app/leads" ? counts.leads
    : to === "/app/campaigns" ? counts.campaigns
    : 0;

  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/app/dashboard" className="flex items-center gap-2 px-2 py-2 font-display font-bold text-base text-sidebar-foreground">
          <span className="grid place-items-center h-7 w-7 rounded-md bg-primary text-primary-foreground shrink-0">
            <Radar className="h-4 w-4" />
          </span>
          {!collapsed && BRAND_NAME}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Workspace</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {ITEMS.map((item) => {
                const active = pathname === item.to || pathname.startsWith(item.to + "/");
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} data-tour={`nav-${item.to.replace("/app/", "")}`}>
                      <Link to={item.to} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span className="flex-1">{item.label}</span>}
                        {!collapsed && badgeFor(item.to) > 0 && (
                          <span className="shrink-0 rounded-full bg-sidebar-accent px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-sidebar-accent-foreground">
                            {badgeFor(item.to) > 999 ? "999+" : badgeFor(item.to)}
                          </span>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}