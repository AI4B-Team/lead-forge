import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { LEAD_FIELDS, SKIP, canonicalField, mappedCount, type ColumnMap } from "@/lib/csv";

/**
 * The shared column-mapping UI used by both the Upload page and the assistant's
 * inline dropzone. Obvious headers arrive pre-matched; only ambiguous fields
 * need a choice.
 */
export function ColumnMapper({
  headers,
  value,
  onChange,
}: {
  headers: string[];
  value: ColumnMap;
  onChange: (next: ColumnMap) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {LEAD_FIELDS.map((f) => {
          const picked = value[f.key] ?? SKIP;
          const auto = picked !== SKIP && canonicalField(picked) === f.key;
          return (
            <div
              key={f.key}
              className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
            >
              <span className="flex items-center gap-1.5 text-sm text-foreground">
                {auto && <Check className="h-3.5 w-3.5 text-success" strokeWidth={3} />}
                {f.label}
              </span>
              <Select value={picked} onValueChange={(v) => onChange({ ...value, [f.key]: v })}>
                <SelectTrigger className="h-8 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SKIP}>Skip Column</SelectItem>
                  {headers.map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {mappedCount(value)} Of {LEAD_FIELDS.length} Fields Mapped. Unmapped Fields Are Skipped.
      </p>
    </div>
  );
}

/** Modal wrapper so the mapper can run inline without leaving the assistant. */
export function ColumnMapperDialog({
  open,
  onOpenChange,
  fileName,
  headers,
  value,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileName: string;
  headers: string[];
  value: ColumnMap;
  onConfirm: (next: ColumnMap) => void;
}) {
  const [draft, setDraft] = useState<ColumnMap>(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Map Your Columns</DialogTitle>
          <DialogDescription>
            {fileName} · {headers.length} Columns Detected. We Matched What We Could — Adjust Anything Below.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[55vh] overflow-y-auto thin-scroll pr-1">
          <Label className="sr-only">Column Mapping</Label>
          <ColumnMapper headers={headers} value={draft} onChange={setDraft} />
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="rounded-full" onClick={() => onConfirm(draft)}>Save Mapping</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
