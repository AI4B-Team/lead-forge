import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Button } from "@/components/ui/button";
import { Zap, Inbox } from "lucide-react";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { ProfileDropdown } from "@/components/app/profile-dropdown";
import { NotificationBell } from "@/components/app/notification-bell";
import { HelpMenu } from "@/components/app/help-menu";
import { ProductTour, useProductTour } from "@/components/app/product-tour";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const { workspaceName } = useWorkspaceId();
  const tour = useProductTour();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-surface-muted">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
              <div className="text-sm text-muted-foreground hidden md:block">{workspaceName ?? "Workspace"}</div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild size="sm" variant="outline" className="rounded-full" data-tour="credits">
                <Link to="/app/billing"><Zap className="mr-1 h-3.5 w-3.5" /> Top Up Credits</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="rounded-full" data-tour="inbox">
                <Link to="/app/inbox"><Inbox className="mr-1 h-3.5 w-3.5" /> Inbox</Link>
              </Button>
              <HelpMenu onStartTour={tour.start} />
              <NotificationBell />
              <ProfileDropdown />
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      <ProductTour open={tour.open} onClose={tour.close} />
    </SidebarProvider>
  );
}