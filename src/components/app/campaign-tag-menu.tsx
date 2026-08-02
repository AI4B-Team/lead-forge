import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Plus, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { listTags, createTag } from "@/lib/tags.functions";
import { updateCampaignConfig } from "@/lib/campaigns.functions";
import { TagBadge, TAG_SWATCHES, type TagLike } from "@/components/app/tag-badge";

/** Inline tag assignment straight from the campaigns list — pick, create, or clear. */
export function CampaignTagMenu({
  workspaceId,
  campaignId,
  tag,
}: {
  workspaceId: string;
  campaignId: string;
  tag?: TagLike | null;
}) {
  const qc = useQueryClient();
  const fetchTags = useServerFn(listTags);
  const addTag = useServerFn(createTag);
  const saveCampaign = useServerFn(updateCampaignConfig);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_SWATCHES[0]);
  const [busy, setBusy] = useState(false);

  const { data } = useQuery({
    queryKey: ["tags", workspaceId],
    queryFn: () => fetchTags({ data: { workspaceId } }),
    enabled: open,
  });
  const tags = data?.tags ?? [];

  const assign = async (tagId: string | null) => {
    setBusy(true);
    try {
      await saveCampaign({ data: { campaignId, tag_id: tagId } });
      await qc.invalidateQueries({ queryKey: ["campaigns", workspaceId] });
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could Not Update Tag");
    } finally {
      setBusy(false);
    }
  };

  const createAndAssign = async () => {
    if (!name.trim()) return toast.error("Name Your Tag");
    setBusy(true);
    try {
      const { tag: created } = await addTag({ data: { workspaceId, name: name.trim(), color } });
      await saveCampaign({ data: { campaignId, tag_id: created.id } });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["tags", workspaceId] }),
        qc.invalidateQueries({ queryKey: ["campaigns", workspaceId] }),
      ]);
      setName("");
      setOpen(false);
      toast.success("Tag Applied");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tag Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Change Tag"
          onClick={(e) => { e.stopPropagation(); }}
          className="inline-flex items-center"
        >
          {tag ? (
            <TagBadge tag={tag} className="hover:opacity-80 transition-opacity" />
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground hover:border-primary transition-colors">
              <TagIcon className="h-3 w-3" /> Add Tag
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-0 bg-background border shadow-xl z-50" onClick={(e) => e.stopPropagation()}>
        <div className="px-3 py-2 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Organize
        </div>
        <ul className="max-h-56 overflow-auto py-1">
          {tags.map((t) => (
            <li key={t.id}>
              <button
                disabled={busy}
                onClick={() => assign(t.id)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted transition-colors text-left"
              >
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                <span className="text-sm truncate flex-1">{t.name}</span>
                {tag?.id === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            </li>
          ))}
          {!tags.length && <li className="px-3 py-2 text-sm text-muted-foreground">No Tags Yet</li>}
        </ul>
        <div className="border-t border-border p-3 space-y-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. HVAC, VIP, Follow Up"
            className="h-8"
          />
          <div className="flex items-center gap-2">
            {TAG_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${
                  color === c ? "ring-2 ring-offset-2 ring-offset-background ring-foreground/70" : ""
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Button size="sm" className="w-full rounded-full" disabled={busy} onClick={createAndAssign}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Create & Apply
          </Button>
          {tag && (
            <button
              type="button"
              disabled={busy}
              onClick={() => assign(null)}
              className="w-full text-[11px] text-muted-foreground hover:text-foreground"
            >
              Remove Tag
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
