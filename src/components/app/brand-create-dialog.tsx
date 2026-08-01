import { useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createBrand } from "@/lib/brands.functions";

/**
 * Create a brand from anywhere — the trigger is supplied by the caller so the
 * AI Brands page can use a card, and toolbars can use a button.
 */
export function BrandCreateDialog({
  workspaceId,
  trigger,
  onCreated,
}: {
  workspaceId: string;
  trigger: ReactNode;
  onCreated?: (id: string) => void;
}) {
  const qc = useQueryClient();
  const add = useServerFn(createBrand);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!name.trim()) return toast.error("Name Your Brand");
    setSaving(true);
    try {
      const { brand } = await add({ data: { workspaceId, name: name.trim(), website, description } });
      await qc.invalidateQueries({ queryKey: ["brands", workspaceId] });
      onCreated?.(brand.id);
      setName("");
      setWebsite("");
      setDescription("");
      setOpen(false);
      toast.success("Brand Created", { description: "Now Feed It Your Knowledge Below." });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Create Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle className="font-display">Teach The AI A New Brand</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>What's Your Company?</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Summit Roofing" />
          </div>
          <div>
            <Label>What's Your Website? (Optional)</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://summitroofing.com" />
            <div className="text-[11px] text-muted-foreground mt-1">
              Add Pages As URL Sources After Creating The Brand.
            </div>
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
  );
}