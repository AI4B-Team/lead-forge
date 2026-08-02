import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Bot, Inbox as InboxIcon, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { listThreads } from "@/lib/inbox.functions";
import { relativeShort } from "@/lib/conversation-intel";

type NeedsReplyThread = {
  thread_key: string;
  last_body: string | null;
  last_inbound_at: string | null;
  last_at: string;
  urgency: number;
  bot_handling: boolean;
  handoff: string | null;
  badges: string[];
  lead: { full_name: string | null; business_name: string | null; phone: string | null } | null;
};

/** Single source of truth for the bot-aware "needs a human reply" set. */
export function useNeedsReply() {
  const { workspaceId } = useWorkspaceId();
  const fetchThreads = useServerFn(listThreads);
  const { data } = useQuery({
    queryKey: ["needs-reply", workspaceId],
    queryFn: () => fetchThreads({ data: { workspaceId: workspaceId!, filter: "needs_reply" } }),
    enabled: !!workspaceId,
    refetchInterval: 30_000,
  });
  const threads = (data?.threads ?? []) as unknown as NeedsReplyThread[];
  return { threads, count: threads.length };
}

/** Top-bar Conversations button carrying the live needs-reply badge. */
export function InboxNavButton() {
  const { count } = useNeedsReply();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          size="icon"
          variant="ghost"
          className="relative rounded-full"
          data-tour="inbox"
          aria-label={count > 0 ? `Conversations — ${count} Need A Reply` : "Conversations"}
        >
          <Link to="/app/inbox" search={count > 0 ? { filter: "needs_reply" } : undefined}>
            <InboxIcon className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-danger text-danger-foreground text-[10px] font-semibold flex items-center justify-center">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{count > 0 ? `${count} Waiting On Your Reply` : "Conversations"}</TooltipContent>
    </Tooltip>
  );
}

function nameOf(t: NeedsReplyThread) {
  return t.lead?.full_name || t.lead?.business_name || t.lead?.phone || "New Reply";
}

/** Dashboard callout that pulls the user straight into the hottest waiting threads. */
export function NeedsReplyCard() {
  const { threads, count } = useNeedsReply();
  const top = threads.slice(0, 4);

  return (
    <Card className={count > 0 ? "border-danger/40" : undefined}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base font-display">
          <MessageSquare className={count > 0 ? "h-4 w-4 text-danger" : "h-4 w-4 text-muted-foreground"} />
          Needs Your Reply
          {count > 0 && <Badge variant="destructive" className="rounded-full">{count}</Badge>}
        </CardTitle>
        {count > 0 && (
          <Button asChild variant="ghost" size="sm">
            <Link to="/app/inbox" search={{ filter: "needs_reply" }}>
              Open <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {count === 0 ? (
          <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            No One Is Waiting On You Right Now
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {top.map((t) => (
              <li key={t.thread_key}>
                <Link
                  to="/app/inbox"
                  search={{ filter: "needs_reply", thread: t.thread_key }}
                  className="flex items-start gap-3 py-2.5 hover:bg-muted/60 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-danger/10 text-danger">
                    {t.handoff ? <Bot className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{nameOf(t)}</span>
                      {t.badges?.[0] && (
                        <Badge variant="secondary" className="rounded-full text-[10px]">{t.badges[0]}</Badge>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{t.last_body ?? ""}</span>
                    <span className="block text-[11px] text-muted-foreground/70">
                      Waiting {relativeShort(t.last_inbound_at ?? t.last_at)}
                      {t.handoff ? " · Agent Handed Off" : t.bot_handling ? " · Hot Lead" : ""}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}