import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Bell, Inbox, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { listThreads } from "@/lib/inbox.functions";

// Bell surfaces unread inbound replies for the active workspace and deep links
// into the Inbox thread that needs attention.
export function NotificationBell() {
  const { workspaceId } = useWorkspaceId();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const fetchThreads = useServerFn(listThreads);

  const { data } = useQuery({
    queryKey: ["notifications-unread", workspaceId],
    queryFn: () => fetchThreads({ data: { workspaceId: workspaceId!, filter: "unread" } }),
    enabled: !!workspaceId,
    refetchInterval: 30_000,
  });

  const threads = (data?.threads ?? []).slice(0, 6);
  const count = data?.threads?.length ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold flex items-center justify-center">
              {count > 9 ? "9+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0 bg-background border shadow-xl z-50">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <p className="text-sm font-semibold">Notifications</p>
          <span className="text-xs text-muted-foreground">{count} Unread</span>
        </div>

        {threads.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Inbox className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">You're All Caught Up</p>
          </div>
        ) : (
          <ul className="max-h-80 overflow-auto divide-y divide-border">
            {threads.map((t) => (
              <li key={t.thread_key}>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate({ to: "/app/inbox" });
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex gap-3"
                >
                  <MessageSquare className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium truncate">
                      {t.lead?.full_name || t.lead?.phone || "New Reply"}
                    </span>
                    <span className="block text-xs text-muted-foreground truncate">{t.last_body ?? ""}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="border-t border-border p-3">
          <Button asChild variant="outline" size="sm" className="w-full rounded-full">
            <Link to="/app/inbox" onClick={() => setOpen(false)}>Open Inbox</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
