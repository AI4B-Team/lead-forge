import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Bot, Inbox as InboxIcon, Loader2, Send, ShieldOff, UserRound, Plus } from "lucide-react";
import { toast } from "sonner";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { listThreads, getThread, markThreadRead, sendReply } from "@/lib/inbox.functions";
import { listQuickReplies, createQuickReply } from "@/lib/tags.functions";

export const Route = createFileRoute("/_authenticated/app/inbox")({
  head: () => ({ meta: [{ title: "Inbox — LeadTrace" }] }),
  component: InboxPage,
});

type Filter = "all" | "unread" | "optouts";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}

function InboxPage() {
  const { workspaceId } = useWorkspaceId();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const qc = useQueryClient();

  const fetchThreads = useServerFn(listThreads);
  const fetchThread = useServerFn(getThread);
  const markRead = useServerFn(markThreadRead);
  const send = useServerFn(sendReply);
  const fetchSnippets = useServerFn(listQuickReplies);
  const addSnippet = useServerFn(createQuickReply);

  const threadsQ = useQuery({
    queryKey: ["inbox-threads", workspaceId, filter],
    queryFn: () => fetchThreads({ data: { workspaceId: workspaceId!, filter } }),
    enabled: !!workspaceId,
    refetchInterval: 15000,
  });

  const threadQ = useQuery({
    queryKey: ["inbox-thread", workspaceId, selected],
    queryFn: () => fetchThread({ data: { workspaceId: workspaceId!, threadKey: selected! } }),
    enabled: !!workspaceId && !!selected,
    refetchInterval: 10000,
  });

  // Operator-approved quick replies — one tap to load into the composer.
  const snippetsQ = useQuery({
    queryKey: ["quick-replies", workspaceId],
    queryFn: () => fetchSnippets({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  const saveSnippet = async () => {
    if (!workspaceId || !reply.trim()) return;
    try {
      await addSnippet({
        data: { workspaceId, title: reply.trim().slice(0, 40), body: reply.trim() },
      });
      qc.invalidateQueries({ queryKey: ["quick-replies", workspaceId] });
      toast.success("Saved As Quick Reply");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save Failed");
    }
  };

  // Auto-select first thread and mark read when opened.
  useEffect(() => {
    if (!selected && threadsQ.data?.threads[0]) setSelected(threadsQ.data.threads[0].thread_key);
  }, [threadsQ.data, selected]);

  useEffect(() => {
    if (!workspaceId || !selected) return;
    markRead({ data: { workspaceId, threadKey: selected } }).then(() => {
      qc.invalidateQueries({ queryKey: ["inbox-threads", workspaceId] });
      qc.invalidateQueries({ queryKey: ["inbox-unread", workspaceId] });
    });
  }, [selected, workspaceId, markRead, qc]);

  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight });
  }, [threadQ.data]);

  const activeThread = useMemo(
    () => threadsQ.data?.threads.find((t) => t.thread_key === selected) ?? null,
    [threadsQ.data, selected],
  );

  const handleSend = async () => {
    if (!workspaceId || !selected || !reply.trim()) return;
    setSending(true);
    try {
      await send({ data: { workspaceId, threadKey: selected, body: reply.trim() } });
      setReply("");
      qc.invalidateQueries({ queryKey: ["inbox-thread", workspaceId, selected] });
      qc.invalidateQueries({ queryKey: ["inbox-threads", workspaceId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed.");
    } finally {
      setSending(false);
    }
  };

  if (!workspaceId) return null;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-h,4rem))]">
      <PageHeader title="Inbox" description="Two-Way SMS Conversations. STOP Replies Auto-Suppress." />
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
        {/* Thread list */}
        <Card className="flex flex-col min-h-0">
          <div className="p-2 border-b flex gap-1">
            {(["all", "unread", "optouts"] as Filter[]).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "ghost"}
                className="rounded-full text-xs capitalize"
                onClick={() => setFilter(f)}
              >
                {f === "optouts" ? "Opt-Outs" : f}
              </Button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto">
            {threadsQ.isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" /> Loading…
              </div>
            ) : !threadsQ.data?.threads.length ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                <InboxIcon className="h-6 w-6 mx-auto mb-2 opacity-40" />
                No Conversations Yet.
              </div>
            ) : (
              threadsQ.data.threads.map((t) => (
                <button
                  key={t.thread_key}
                  onClick={() => setSelected(t.thread_key)}
                  className={cn(
                    "w-full text-left px-3 py-3 border-b hover:bg-muted/40 transition-colors",
                    selected === t.thread_key && "bg-muted/60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">
                      {t.lead?.full_name || t.lead?.phone || t.thread_key}
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0">{timeAgo(t.last_at)}</div>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-xs text-muted-foreground truncate flex-1">
                      {t.last_direction === "outbound" ? "You: " : ""}{t.last_body}
                    </p>
                    {t.is_optout && <ShieldOff className="h-3 w-3 text-danger shrink-0" />}
                    {t.unread > 0 && (
                      <span className="rounded-full bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 min-w-[18px] text-center">
                        {t.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Conversation pane */}
        <Card className="flex flex-col min-h-0">
          {!selected ? (
            <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
              Select A Conversation.
            </div>
          ) : (
            <>
              <div className="p-3 border-b flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-display font-bold">
                    {threadQ.data?.lead?.full_name || threadQ.data?.lead?.phone || activeThread?.thread_key}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-x-2">
                    <span className="inline-flex items-center gap-1">
                      <UserRound className="h-3 w-3" /> Lead {threadQ.data?.lead?.phone}
                    </span>
                    {threadQ.data?.number && (
                      <span className="inline-flex items-center gap-1">
                        <Send className="h-3 w-3" /> Sent From {threadQ.data.number.phone}
                      </span>
                    )}
                    {threadQ.data?.lead?.city ? <span>· {threadQ.data.lead.city}, {threadQ.data.lead.state}</span> : null}
                  </div>
                </div>
                {threadQ.data?.handoff && (
                  <Badge variant="outline" className="bg-warn/10 text-warn border-warn/20 text-xs">
                    Handoff: {threadQ.data.handoff}
                  </Badge>
                )}
                {activeThread?.is_optout && (
                  <Badge variant="outline" className="bg-danger/10 text-danger border-danger/20">Opted Out</Badge>
                )}
              </div>
              <div ref={scrollerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {threadQ.data?.messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.direction === "outbound" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                        m.direction === "outbound"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm",
                      )}
                    >
                      <div className="whitespace-pre-wrap">{m.body}</div>
                      <div className={cn(
                        "text-[10px] mt-1 opacity-70",
                        m.direction === "outbound" ? "text-primary-foreground" : "text-muted-foreground",
                      )}>
                        {new Date(m.created_at).toLocaleString()} · {m.status}
                        {m.is_bot ? " · Bot" : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {!!snippetsQ.data?.snippets.length && (
                <div className="px-3 pt-2 flex flex-wrap gap-1">
                  {snippetsQ.data.snippets.map((s) => (
                    <Button
                      key={s.id}
                      size="sm"
                      variant="outline"
                      className="rounded-full h-7 text-xs"
                      onClick={() => setReply(s.body)}
                    >
                      {s.title}
                    </Button>
                  ))}
                </div>
              )}
              <div className="p-3 border-t flex gap-2">
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={activeThread?.is_optout ? "Contact has opted out — replies disabled." : "Type a reply…"}
                  disabled={activeThread?.is_optout || sending}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full shrink-0"
                  title="Save As Quick Reply"
                  onClick={saveSnippet}
                  disabled={!reply.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button onClick={handleSend} disabled={activeThread?.is_optout || sending || !reply.trim()} className="rounded-full">
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}