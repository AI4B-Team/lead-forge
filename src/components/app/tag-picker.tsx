import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { listTags, createTag } from "@/lib/tags.functions";

const SWATCHES = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2"];

/** Colored tag picker with inline creation — never leaves the campaign builder. */
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

  const { data } = useQuery({
    queryKey: ["tags", workspaceId],
    queryFn: () => fetchTags({ data: { workspaceId } }),
  });
  const tags = data?.tags ?? [];

  const create = async () => {
    if (!name.trim()) return;
    try {
      const { tag } = await addTag({ data: { workspaceId, name: name.trim(), color } });
      await qc.invalidateQueries({ queryKey: ["tags", workspaceId] });
      onChange(tag.id);
      setName("");
      setOpen(false);
      toast.success("Tag Created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Tag Failed");
    }
  };

  return (
    <div>
      <Label>Tag</Label>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {tags.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(value === t.id ? null : t.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${value === t.id ? "ring-2 ring-offset-1 ring-primary" : ""}`}
            style={{ backgroundColor: `${t.color}1a`, color: t.color, borderColor: `${t.color}55` }}
          >
            {t.name}
          </button>
        ))}
        <Button type="button" size="sm" variant="outline" className="rounded-full h-7" onClick={() => setOpen((v) => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Tag
        </Button>
      </div>
      {open && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-border p-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tag Name" className="h-8 w-48" />
          <div className="flex items-center gap-1">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className={`h-6 w-6 rounded-full border ${color === c ? "ring-2 ring-offset-1 ring-primary" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Button type="button" size="sm" className="rounded-full h-8" onClick={create}>Add</Button>
        </div>
      )}
    </div>
  );
}