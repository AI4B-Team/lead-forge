// One entry point for every attached file: the user says what the file IS
// before anything is changed in the List Builder.
import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, ListFilter, Sparkles, Target, ShieldBan, GraduationCap } from "lucide-react";
import {
  INTENT_HINT, INTENT_LABEL, TARGET_KIND_LABEL,
  type IntentDetection, type UploadIntent,
} from "@/lib/upload-intent";

const ICONS: Record<UploadIntent, typeof Target> = {
  import: FileSpreadsheet,
  enrich: Sparkles,
  targets: Target,
  suppression: ShieldBan,
};

export function UploadIntentDialog({
  open,
  fileName,
  detection,
  /** Suppression is only meaningful once there's a scrape to filter. */
  allowSuppression,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  fileName: string;
  detection: IntentDetection | null;
  allowSuppression: boolean;
  onCancel: () => void;
  onConfirm: (intent: UploadIntent) => void;
}) {
  const [choice, setChoice] = useState<UploadIntent>("import");

  useEffect(() => {
    if (detection) setChoice(detection.inferred);
  }, [detection]);

  const options: UploadIntent[] = [
    "import",
    "enrich",
    "targets",
    ...(allowSuppression ? (["suppression"] as UploadIntent[]) : []),
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-[34rem]">
        <DialogHeader>
          <DialogTitle>What's In This File?</DialogTitle>
          <DialogDescription>
            {fileName}
            {detection ? ` — ${detection.summary}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {options.map((intent) => {
            const Icon = ICONS[intent];
            const active = choice === intent;
            return (
              <button
                key={intent}
                type="button"
                onClick={() => setChoice(intent)}
                className={`flex w-full cursor-pointer items-start gap-3 rounded-xl border p-3 text-left transition ${
                  active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    {INTENT_LABEL[intent]}
                    {detection?.inferred === intent && (
                      <Badge variant="secondary" className="text-[10px]">Detected</Badge>
                    )}
                    {intent === "targets" && detection && (
                      <Badge variant="outline" className="text-[10px]">
                        {TARGET_KIND_LABEL[detection.targetKind]}
                      </Badge>
                    )}
                  </span>
                  <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                    {INTENT_HINT[intent]}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {detection?.brandLike && (
          <p className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            <GraduationCap className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            This Looks Like Brand Material (Scripts Or FAQs). Train Your Assistant With It On The AI Agent Page —
            List Uploads Are For Lead Data And Scrape Settings.
          </p>
        )}

        {!allowSuppression && (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <ListFilter className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Pick A Scrape Source First To Use A File As A Suppression List.
          </p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="cursor-pointer">Cancel</Button>
          <Button onClick={() => onConfirm(choice)} className="cursor-pointer">Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}