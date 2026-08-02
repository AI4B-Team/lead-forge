/**
 * Inline lead/conversation tagging. Per-contact labels ("callback", "quoted",
 * "not now") that are fully editable wherever the user is working — no redirect
 * to the Campaigns page. Campaign-structure tags stay on the Campaigns page;
 * these draw from the same workspace tag vocabulary.
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Loader2, Plus, Tag as TagIcon, X } from "lucide-react";
import { toast } from "sonner";
import { listTags, listLeadTags, addLeadTag, removeLeadTag } from "@/lib/tags.functions";

const TAG_COLORS = ["#e11d48", "#0ea5e9", "#16a34a", "#f59e0b", "#7c3aed", "#0f766e"];

export function LeadTagBar({
  workspaceId,
  leadId,
  open,
  onOpenChange,
  className,
}: {
  workspaceId: string | null | undefined;
  leadId: string | null | undefined;
  open?: boolean;
  onOpenChange?: (v: boolean) => void;
  className?: string;
}) {
  const qc = useQueryClient();
  const fetchTags = useServerFn(listTags);
  const fetchLeadTags = useServerFn(listLeadTags);
  const runAdd = useServerFn(addLeadTag);
  const runRemove = useServerFn(removeLeadTag);
  const [query, setQuery] = useState("");

  const allQ = useQuery({
    queryKey: ["tags", workspaceId],
    queryFn: () => fetchTags({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const mineQ = useQuery({
    queryKey: ["lead-tags", workspaceId, leadId],
    queryFn: () => fetchLeadTags({ data: { workspaceId: workspaceId!, leadId: leadId! } }),
    enabled: !!workspaceId && !!leadId,
  });

  const applied = mineQ.data?.tags ?? [];
  const all = allQ.data?.tags ?? [];
  const appliedIds = new Set(applied.map((t) => t.id));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["lead-tags", workspaceId, leadId] });
    qc.invalidateQueries({ queryKey: ["tags", workspaceId] });
    qc.invalidateQueries({ queryKey: ["inbox-threads", workspaceId] });
    qc.invalidateQueries({ queryKey: ["lead-records", workspaceId] });
  };

  const addM = useMutation({
    mutationFn: (vars: { tagId?: string; name?: string }) =>
      runAdd({
        data: {
          workspaceId: workspaceId!,
          leadId: leadId!,
          ...(vars.tagId ? { tagId: vars.tagId } : {}),
          ...(vars.name
            ? { name: vars.name, color: TAG_COLORS[all.length % TAG_COLORS.length] }
            : {}),
        },
      }),
    onSuccess: () => {
      setQuery("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could Not Add Tag"),
  });

  const removeM = useMutation({
    mutationFn: (tagId: string) => runRemove({ data: { workspaceId: workspaceId!, leadId: leadId!, tagId } }),
    onSuccess: invalidate,
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could Not Remove Tag"),
  });

  const term = query.trim();
  const matches = all.filter((t) => t.name.toLowerCase().includes(term.toLowerCase()));
  const exact = all.some((t) => t.name.toLowerCase() === term.toLowerCase());
  const disabled = !leadId || !workspaceId;

  return (
    <div className={className}>
      <div className="flex items-center gap-1 flex-wrap">
        {applied.map((t) => (
          <Badge
            key={t.id}
            variant="outline"
            className="text-[10px] gap-1 pr-1"
            style={{ borderColor: t.color, color: t.color }}
          >
            {t.name}
            <button
              type="button"
              aria-label={`Remove ${t.name}`}
              onClick={() => removeM.mutate(t.id)}
              className="rounded-full hover:bg-muted p-0.5"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={onOpenChange}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              disabled={disabled}
              className="h-6 rounded-full text-[11px] px-2 text-muted-foreground"
            >
              <TagIcon className="h-3 w-3 mr-1" /> {applied.length ? "Edit Tags" : "Add Tag"}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-60 p-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && term && !exact) {
                  e.preventDefault();
                  addM.mutate({ name: term });
                }
              }}
              placeholder="Find Or Create A Tag…"
              className="h-8 text-xs"
            />
            <div className="mt-2 max-h-56 overflow-y-auto thin-scroll">
              {matches.map((t) => {
                const on = appliedIds.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => (on ? removeM.mutate(t.id) : addM.mutate({ tagId: t.id }))}
                    className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted text-left"
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: t.color }} />
                    <span className="truncate flex-1">{t.name}</span>
                    {on && <Check className="h-3 w-3 text-primary" />}
                  </button>
                );
              })}
              {!matches.length && !term && (
                <p className="px-2 py-2 text-xs text-muted-foreground">No Tags Yet — Type To Create One.</p>
              )}
              {term && !exact && (
                <button
                  type="button"
                  onClick={() => addM.mutate({ name: term })}
                  className="w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted text-left"
                >
                  {addM.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Create “{term}”
                </button>
              )}
            </div>
            <p className="mt-1 px-2 text-[10px] text-muted-foreground">
              Lead Tags Apply To This Contact Only.
            </p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

/** Read-only chips for list rows and tables. */
export function LeadTagChips({
  tags,
  max = 3,
  className,
}: {
  tags: Array<{ id: string; name: string; color: string }>;
  max?: number;
  className?: string;
}) {
  if (!tags.length) return null;
  const shown = tags.slice(0, max);
  return (
    <span className={className}>
      {shown.map((t) => (
        <Badge
          key={t.id}
          variant="outline"
          className="text-[10px] px-1.5 py-0 h-[18px] mr-1"
          style={{ borderColor: t.color, color: t.color }}
        >
          {t.name}
        </Badge>
      ))}
      {tags.length > max && <span className="text-[10px] text-muted-foreground">+{tags.length - max}</span>}
    </span>
  );
}
