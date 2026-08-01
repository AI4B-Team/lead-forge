import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pipette } from "lucide-react";
import { toast } from "sonner";
import { listTags, createTag } from "@/lib/tags.functions";

const SWATCHES = [
  "#2563eb", "#3b82f6", "#0891b2", "#06b6d4", "#14b8a6", "#10b981",
  "#16a34a", "#65a30d", "#eab308", "#f59e0b", "#f97316", "#dc2626",
  "#e11d48", "#ec4899", "#a855f7", "#7c3aed", "#6366f1", "#64748b",
];

const CUSTOM_KEY = "lf-custom-tag-colors";
const isHex = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v);

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
  const [color, setColor] = useState(SWATCHES[0]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [custom, setCustom] = useState<string[]>([]);
  const [customDraft, setCustomDraft] = useState("#");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      if (raw) setCustom((JSON.parse(raw) as string[]).filter(isHex).slice(0, 24));
    } catch { /* ignore */ }
  }, []);

  const addCustom = (hex: string) => {
    const v = hex.startsWith("#") ? hex.toLowerCase() : `#${hex.toLowerCase()}`;
    if (!isHex(v)) return toast.error("Enter A Hex Color Like #1F2937");
    setColor(v);
    if (!SWATCHES.includes(v) && !custom.includes(v)) {
      const next = [v, ...custom].slice(0, 24);
      setCustom(next);
      try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(next)); } catch { /* ignore */ }
    }
    setCustomDraft("#");
  };

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
                <div className="mt-1 flex items-center gap-2">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Color ${c}`}
                      onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full border ${color === c ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
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
