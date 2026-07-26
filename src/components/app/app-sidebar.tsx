import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Plus,
  ListChecks,
  MessageSquare,
  Phone,
  ShieldCheck,
  Settings,
  CreditCard,
  Flame,
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
  { to: "/app/new-job", label: "New Job", icon: Plus },
  { to: "/app/lists", label: "Lists", icon: ListChecks },
  { to: "/app/campaigns", label: "Campaigns", icon: MessageSquare },
  { to: "/app/numbers", label: "Numbers", icon: Phone },
  { to: "/app/compliance", label: "Compliance", icon: ShieldCheck },
  { to: "/app/settings", label: "Settings", icon: Settings },
  { to: "/app/billing", label: "Billing", icon: CreditCard },
] as const;

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <Link to="/app/dashboard" className="flex items-center gap-2 px-2 py-2 font-display font-bold text-base text-sidebar-foreground">
          <span className="grid place-items-center h-7 w-7 rounded-md bg-primary text-primary-foreground shrink-0">
            <Flame className="h-3.5 w-3.5" />
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
                    <SidebarMenuButton asChild isActive={active}>
                      <Link to={item.to} className="flex items-center gap-2">
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.label}</span>}
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