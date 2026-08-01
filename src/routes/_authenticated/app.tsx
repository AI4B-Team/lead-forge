import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Button } from "@/components/ui/button";
import { Zap, Inbox } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
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
            <TooltipProvider delayDuration={150}>
              <div className="flex items-center gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild size="icon" variant="ghost" className="rounded-full" data-tour="credits" aria-label="Top Up Credits">
                      <Link to="/app/billing"><Zap className="h-4 w-4" /></Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Top Up Credits</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button asChild size="icon" variant="ghost" className="rounded-full" data-tour="inbox" aria-label="Inbox">
                      <Link to="/app/inbox"><Inbox className="h-4 w-4" /></Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Inbox</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex"><HelpMenu onStartTour={tour.start} /></span>
                  </TooltipTrigger>
                  <TooltipContent>Help</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex"><NotificationBell /></span>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex"><ProfileDropdown /></span>
                  </TooltipTrigger>
                  <TooltipContent>Account</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
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