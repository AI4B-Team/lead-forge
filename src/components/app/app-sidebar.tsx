import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Plus,
  ListChecks,
  MessageSquare,
  Phone,
  Radar,
  Inbox,
  BarChart3,
  BrainCircuit,
  Sparkles,
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
import { useWorkspaceId } from "@/hooks/use-workspace";
import { unreadCount } from "@/lib/inbox.functions";

const ITEMS = [
  { to: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app/assistant", label: "AI Assistant", icon: Sparkles },
  { to: "/app/new-job", label: "New Job", icon: Plus },
  { to: "/app/lists", label: "Lists", icon: ListChecks },
  { to: "/app/brands", label: "Brands", icon: BrainCircuit },
  { to: "/app/campaigns", label: "Campaigns", icon: MessageSquare },
  { to: "/app/inbox", label: "Inbox", icon: Inbox },
  { to: "/app/reports", label: "Reports", icon: BarChart3 },
  { to: "/app/numbers", label: "Numbers", icon: Phone },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { workspaceId } = useWorkspaceId();
  const fetchUnread = useServerFn(unreadCount);
  const { data: unread } = useQuery({
    queryKey: ["inbox-unread", workspaceId],
    queryFn: () => fetchUnread({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
    refetchInterval: 30000,
  });

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
                const showBadge = item.to === "/app/inbox" && (unread?.count ?? 0) > 0;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} data-tour={`nav-${item.to.replace("/app/", "")}`}>
                      <Link to={item.to} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span className="flex-1">{item.label}</span>}
                        {!collapsed && showBadge && (
                          <span className="ml-auto rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
                            {unread!.count > 99 ? "99+" : unread!.count}
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