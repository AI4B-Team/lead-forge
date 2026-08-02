import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { listTags, createTag } from "@/lib/tags.functions";
import { TagColorPicker } from "@/components/app/tag-color-picker";
import { TAG_SWATCHES } from "@/components/app/tag-badge";

/** Tag dropdown with modal creation when the workspace has none to pick from. */
export function TagPicker({
  workspaceId,
  value,
  onChange,
}: {
  workspaceId: string;
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const qc = useQueryClient();
  const fetchTags = useServerFn(listTags);
  const addTag = useServerFn(createTag);
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_SWATCHES[0]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["tags", workspaceId],
    queryFn: () => fetchTags({ data: { workspaceId } }),
  });
  const tags = data?.tags ?? [];

  const create = async () => {
    if (!name.trim()) return toast.error("Name Your Tag");
    setSaving(true);
    try {
      const { tag } = await addTag({ data: { workspaceId, name: name.trim(), color } });
      await qc.invalidateQueries({ queryKey: ["tags", workspaceId] });
      onChange(tag.id);
      setName("");
      setOpen(false);
      toast.success("Tag Created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tag Failed");
    } finally {
      setSaving(false);
    }
  };

  const selected = tags.find((t) => t.id === value);

  return (
    <div>
      <Label>Tag</Label>
      <div className="mt-1 flex items-center gap-2">
        <Select value={value ?? ""} onValueChange={(v) => onChange(v || null)} disabled={!tags.length}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={tags.length ? "Select A Tag" : "No Tags Yet"}>
              {selected && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-semibold border"
                  style={{ backgroundColor: `${selected.color}1a`, color: selected.color, borderColor: `${selected.color}55` }}
                >
                  {selected.name}
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {tags.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  {t.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="rounded-full shrink-0">
              <Plus className="h-4 w-4 mr-1" /> New Tag
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="font-display">Create A Tag</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Tag Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q1 Roofing" />
              </div>
              <div>
                <Label>Color</Label>
                <div className="mt-1.5 grid grid-cols-9 gap-2">
                  {[...SWATCHES, ...custom].map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Color ${c}`}
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full border transition-transform hover:scale-110 ${color === c ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label className="relative h-8 w-8 shrink-0 cursor-pointer rounded-full border grid place-items-center" aria-label="Pick A Custom Color">
                    <Pipette className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="color"
                      value={isHex(color) ? color : "#2563eb"}
                      onChange={(e) => addCustom(e.target.value)}
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    />
                  </label>
                  <Input
                    value={customDraft}
                    onChange={(e) => setCustomDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(customDraft); } }}
                    placeholder="#1F2937"
                    className="h-8 flex-1 font-mono text-xs"
                  />
                  <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => addCustom(customDraft)}>
                    Add Color
                  </Button>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">
                  Selected <span className="font-mono">{color}</span> — Custom Colors Are Saved For Reuse.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="rounded-full" onClick={create} disabled={saving}>{saving ? "Creating…" : "Create Tag"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {value && (
        <button type="button" className="text-[11px] text-muted-foreground mt-1 hover:text-foreground" onClick={() => onChange(null)}>
          Clear Tag
        </button>
      )}
    </div>
  );
}
