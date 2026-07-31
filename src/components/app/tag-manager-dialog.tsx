import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Tags } from "lucide-react";
import { toast } from "sonner";
import { listTags, createTag, updateTag, deleteTag } from "@/lib/tags.functions";
import { TAG_SWATCHES } from "@/components/app/tag-badge";

/** Workspace tag library — rename, recolor, delete, or add tags. */
export function TagManagerDialog({ workspaceId }: { workspaceId: string }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState(TAG_SWATCHES[0]);
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
        <DialogHeader><DialogTitle className="font-display">Manage Tags</DialogTitle></DialogHeader>

        <div className="space-y-2 max-h-64 overflow-auto">
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
          {!tags.length && <p className="text-sm text-muted-foreground">No Tags Yet. Create Your First Below.</p>}
        </div>

        <div className="border-t border-border pt-3 space-y-2">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New Tag Name" className="h-9" />
          <div className="flex items-center gap-2">
            {TAG_SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setNewColor(c)}
                className={`h-6 w-6 rounded-full border ${newColor === c ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Button
            className="w-full rounded-full"
            disabled={busy}
            onClick={() => {
              if (!newName.trim()) return toast.error("Name Your Tag");
              run(() => add({ data: { workspaceId, name: newName.trim(), color: newColor } }), "Tag Created").then(() =>
                setNewName(""),
              );
            }}
          >
            <Plus className="mr-1 h-4 w-4" /> Create Tag
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
