import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { History, ShieldCheck, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetTrigger } from "@/components/ui/sheet";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { ACTIVITY_GROUPS } from "@/lib/activity.shared";
import { ActivityList, useActivity } from "./activity-feed";

/**
 * Slide-out account activity. Deliberately NOT the notification bell: the bell
 * is what needs you, this is the passive stream of what occurred. Opens in place
 * so the user never loses their page.
 */
export function ActivityPanel() {
  const { workspaceId } = useWorkspaceId();
  const [open, setOpen] = useState(false);
  const [group, setGroup] = useState("all");
  const { data } = useActivity(open ? workspaceId : null, group, 60);
  const events = data?.events ?? [];
  const optOuts = data?.optOutsToday ?? 0;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="icon" variant="ghost" className="rounded-full" aria-label="Activity">
          <History className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="px-4 pt-5 pb-3 text-left">
          <SheetTitle className="font-display">Activity</SheetTitle>
          <SheetDescription>
            Everything That Happened In This Workspace — Lists, Campaigns, Credits, And Numbers.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 pb-3">
          {ACTIVITY_GROUPS.map((g) => (
            <button
              key={g.key}
              onClick={() => setGroup(g.key)}
              className={`cursor-pointer rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                group === g.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {optOuts > 0 && (
          <Link
            to="/app/compliance"
            onClick={() => setOpen(false)}
            className="flex cursor-pointer items-center gap-2 border-b border-border bg-muted/50 px-4 py-3 text-sm hover:bg-muted"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span className="flex-1">
              {optOuts} {optOuts === 1 ? "Contact" : "Contacts"} Opted Out Today
            </span>
            <span className="whitespace-nowrap text-xs font-medium text-primary">
              View In Compliance <ArrowUpRight className="inline h-3 w-3" />
            </span>
          </Link>
        )}

        <div className="min-h-0 flex-1 overflow-auto">
          <ActivityList events={events} onNavigate={() => setOpen(false)} />
        </div>

        <div className="border-t border-border p-3">
          <p className="px-1 pb-2 text-[11px] leading-snug text-muted-foreground">
            Activity Is For Orientation. The Permanent, Searchable Opt-Out And Blocked-Send Record
            Lives On Compliance.
          </p>
          <Button asChild variant="outline" size="sm" className="w-full rounded-full">
            <Link to="/app/compliance" onClick={() => setOpen(false)}>Open Compliance Log</Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}