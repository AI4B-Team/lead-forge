import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app/app-sidebar";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { WorkspaceSwitcher } from "@/components/app/workspace-switcher";
import { ProfileDropdown } from "@/components/app/profile-dropdown";
import { NotificationBell } from "@/components/app/notification-bell";
import { ActivityPanel } from "@/components/app/activity-panel";
import { HelpMenu } from "@/components/app/help-menu";
import { ProductTour, useProductTour } from "@/components/app/product-tour";
import { CreditMenu } from "@/components/app/credit-menu";
import { SeatGuard } from "@/components/app/seat-guard";
import { InboxNavButton } from "@/components/app/needs-reply";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  const tour = useProductTour();
  const navigate = useNavigate();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-surface-muted">
        <SeatGuard />
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border bg-background px-4">
            <div className="flex items-center gap-2">
              <div className="hidden md:block"><WorkspaceSwitcher /></div>
            </div>
            <TooltipProvider delayDuration={150}>
              <div className="flex items-center gap-1">
                {/* Credits + Build List sit together: having credits nudges using them. */}
                <div className="mr-2 flex items-center gap-2">
                  <CreditMenu />
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => navigate({ to: "/app/assistant" })}
                  >
                    <Plus className="mr-1 h-3.5 w-3.5" /> Build List
                  </Button>
                </div>
                <InboxNavButton />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex"><ActivityPanel /></span>
                  </TooltipTrigger>
                  <TooltipContent>Activity</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex"><NotificationBell /></span>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex"><HelpMenu onStartTour={tour.start} /></span>
                  </TooltipTrigger>
                  <TooltipContent>Help</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex ml-1.5"><ProfileDropdown /></span>
                  </TooltipTrigger>
                  <TooltipContent>Account</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </header>
          <main className="flex-1 overflow-auto">
            <div className="app-density p-6 md:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <ProductTour open={tour.open} onClose={tour.close} />
    </SidebarProvider>
  );
}