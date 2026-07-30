import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { listBrands, createBrand } from "@/lib/brands.functions";

/**
 * Pick which brand a campaign speaks for. If the workspace has none yet, the
 * same control opens a modal to create the first one.
 */
export function BrandPicker({
  workspaceId,
  value,
  onChange,
  label = "Brand",
}: {
  workspaceId: string;
  value: string | null;
  onChange: (id: string | null) => void;
  label?: string;
}) {
  const qc = useQueryClient();
  const fetchBrands = useServerFn(listBrands);
  const add = useServerFn(createBrand);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const { data } = useQuery({
    queryKey: ["brands", workspaceId],
    queryFn: () => fetchBrands({ data: { workspaceId } }),
  });
  const brands = data?.brands ?? [];

  const create = async () => {
    if (!name.trim()) return toast.error("Name Your Brand");
    setSaving(true);
    try {
      const { brand } = await add({ data: { workspaceId, name: name.trim(), website, description } });
      await qc.invalidateQueries({ queryKey: ["brands", workspaceId] });
      onChange(brand.id);
      setName("");
      setWebsite("");
      setDescription("");
      setOpen(false);
      toast.success("Brand Created");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <Select
          value={value ?? ""}
          onValueChange={(v) => onChange(v || null)}
          disabled={!brands.length}
        >
          <SelectTrigger className="flex-1">
            <SelectValue placeholder={brands.length ? "Select A Brand" : "No Brands Yet"} />
          </SelectTrigger>
          <SelectContent>
            {brands.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="rounded-full shrink-0">
              <Plus className="h-4 w-4 mr-1" /> New Brand
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Create A Brand</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Brand / Product / Service Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summit Roofing" />
              </div>
              <div>
                <Label>Website (Optional)</Label>
                <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://summitroofing.com" />
              </div>
              <div>
                <Label>What You Offer (Optional)</Label>
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Who you serve, what you sell, how you talk, what you never promise…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
              <Button className="rounded-full" onClick={create} disabled={saving}>{saving ? "Creating…" : "Create Brand"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      {!brands.length && (
        <div className="text-[11px] text-muted-foreground mt-1">
          Create A Brand First — The Bot Only Speaks From Approved Brand Material.
        </div>
      )}
    </div>
  );
}
