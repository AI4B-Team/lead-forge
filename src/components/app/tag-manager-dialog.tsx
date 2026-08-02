import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Tags, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { listTags, createTag, updateTag, deleteTag } from "@/lib/tags.functions";
import { TAG_COLORS, TagBadge, nextTagColor } from "@/components/app/tag-badge";

/** Optional glyphs make tags scannable at a glance; stored as a name prefix. */
const TAG_EMOJI = ["🔥", "⭐", "📞", "💰", "🏠", "🧊"];

/** Workspace tag library — rename, recolor, delete, or add tags. */
export function TagManagerDialog({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string | null>(null);
  const [emoji, setEmoji] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchTags = useServerFn(listTags);
  const add = useServerFn(createTag);
  const edit = useServerFn(updateTag);
  const remove = useServerFn(deleteTag);

  const { data } = useQuery({
    queryKey: ["tags", workspaceId],
    queryFn: () => fetchTags({ data: { workspaceId } }),
    enabled: open,
  });
  const tags = data?.tags ?? [];

  // Auto-assign the next color in rotation so creating a tag is one decision.
  const autoColor = nextTagColor(tags.map((t) => t.color));
  const activeColor = newColor ?? autoColor;

  useEffect(() => {
    if (!open) {
      setNewName("");
      setNewColor(null);
      setEmoji(null);
    }
  }, [open]);

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["tags", workspaceId] }),
      qc.invalidateQueries({ queryKey: ["campaigns", workspaceId] }),
    ]);

  const run = async (fn: () => Promise<unknown>, msg?: string) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
      if (msg) toast.success(msg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something Went Wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-full">
          <Tags className="mr-1.5 h-4 w-4" /> Manage Tags
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="space-y-1">
          <DialogTitle className="font-display">Manage Tags</DialogTitle>
          <p className="text-sm text-muted-foreground">Organize Campaigns With Color-Coded Labels.</p>
        </DialogHeader>

        <div className="space-y-2 max-h-56 overflow-auto">
          {tags.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <input
                type="color"
                value={t.color}
                aria-label={`Color For ${t.name}`}
                onChange={(e) => run(() => edit({ data: { id: t.id, color: e.target.value } }))}
                className="h-8 w-8 rounded-full border border-border bg-transparent p-0.5 cursor-pointer"
              />
              <Input
                defaultValue={t.name}
                className="h-8 flex-1"
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v && v !== t.name) run(() => edit({ data: { id: t.id, name: v } }), "Tag Renamed");
                }}
              />
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${t.name}`}
                disabled={busy}
                onClick={() => run(() => remove({ data: { id: t.id } }), "Tag Deleted")}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          {!tags.length && (
            <p className="text-sm text-muted-foreground">
              Create Tags To Group Campaigns By Niche, Client, Or Strategy.
            </p>
          )}
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="tag-name" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Tag Name
            </label>
            <Input
              id="tag-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. HVAC, VIP, Follow Up"
              className="h-10"
            />
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Color</span>
            <div className="flex items-center gap-3">
              {TAG_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  title={c.label}
                  aria-label={c.label}
                  aria-pressed={activeColor === c.value}
                  onClick={() => setNewColor(c.value)}
                  className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${
                    activeColor === c.value ? "ring-2 ring-offset-2 ring-offset-background ring-foreground/70" : ""
                  }`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Icon (Optional)</span>
            <div className="flex items-center gap-2">
              {TAG_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`Icon ${e}`}
                  aria-pressed={emoji === e}
                  onClick={() => setEmoji(emoji === e ? null : e)}
                  className={`h-8 w-8 rounded-full border text-sm leading-none transition-colors ${
                    emoji === e ? "border-foreground/60 bg-muted" : "border-border hover:bg-muted/60"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</span>
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <TagIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <TagBadge
                tag={{
                  id: "preview",
                  color: activeColor,
                  name: [emoji, newName.trim() || "Your Tag"].filter(Boolean).join(" "),
                }}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" className="rounded-full" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-full"
              disabled={busy}
              onClick={() => {
                if (!newName.trim()) return toast.error("Name Your Tag");
                const name = [emoji, newName.trim()].filter(Boolean).join(" ");
                run(() => add({ data: { workspaceId, name, color: activeColor } }), "Tag Created").then(() => {
                  setNewName("");
                  setNewColor(null);
                  setEmoji(null);
                });
              }}
            >
              Create Tag
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
