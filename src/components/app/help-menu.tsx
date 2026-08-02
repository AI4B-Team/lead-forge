import { useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CircleHelp,
  BookOpen,
  PlayCircle,
  MessageSquarePlus,
  LifeBuoy,
  Paperclip,
  Sparkles,
  Loader2,
  CircleCheckBig,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { submitFeedback, polishFeedback, FEEDBACK_CATEGORIES } from "@/lib/help.functions";

type Category = (typeof FEEDBACK_CATEGORIES)[number];

/** Help icon in the app header: Help · Tour · Tutorials · Feedback. */
export function HelpMenu({ onStartTour }: { onStartTour: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<Category | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [polishing, setPolishing] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const send = useServerFn(submitFeedback);
  const polish = useServerFn(polishFeedback);

  const go = (path: string) => {
    setOpen(false);
    navigate({ to: path });
  };

  const reset = () => {
    setBody("");
    setCategory(null);
    setFile(null);
    setSent(false);
  };

  const openFeedback = () => {
    reset();
    setFeedbackOpen(true);
  };

  /** Uploads the screenshot into the user's own folder; returns the object path. */
  const uploadScreenshot = async (): Promise<string | null> => {
    if (!file) return null;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
    const path = `${auth.user.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("feedback").upload(path, file, {
      contentType: file.type || "image/png",
    });
    if (error) {
      toast.error("Screenshot Didn't Upload — Sending Your Note Anyway");
      return null;
    }
    return path;
  };

  const improve = async () => {
    if (body.trim().length < 3) return toast.error("Write A Little First");
    setPolishing(true);
    try {
      const res = await polish({ data: { body, category } });
      if (res.text) {
        setBody(res.text);
        toast.success("Sharpened Your Feedback");
      } else {
        toast.error("Couldn't Improve That Right Now");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't Improve That Right Now");
    } finally {
      setPolishing(false);
    }
  };

  const submit = async () => {
    if (body.trim().length < 3) return toast.error("Tell Us A Little More");
    setBusy(true);
    try {
      const screenshotPath = await uploadScreenshot();
      await send({ data: { body, category, screenshotPath } });
      setSent(true);
      toast.success("Thanks — Feedback Received");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something Went Wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            data-tour="help"
            aria-label="Open help menu"
            className="grid place-items-center h-9 w-9 rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground transition-colors"
          >
            <CircleHelp className="h-5 w-5" strokeWidth={1.5} />
          </button>
        </PopoverTrigger>
        <PopoverContent side="bottom" align="end" sideOffset={8} className="w-64 p-2">
          <Item icon={<LifeBuoy className="h-4 w-4" />} label="Help" onClick={() => go("/help")} />
          <Item
            icon={<PlayCircle className="h-4 w-4" />}
            label="Tour"
            onClick={() => {
              setOpen(false);
              onStartTour();
            }}
          />
          <Item icon={<BookOpen className="h-4 w-4" />} label="Tutorials" onClick={() => go("/tutorials")} />
          <Item
            icon={<MessageSquarePlus className="h-4 w-4" />}
            label="Feedback"
            onClick={() => {
              setOpen(false);
              openFeedback();
            }}
          />
        </PopoverContent>
      </Popover>

      <Dialog
        open={feedbackOpen}
        onOpenChange={(v) => {
          setFeedbackOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CircleCheckBig className="h-6 w-6" />
              </div>
              <DialogTitle className="font-display text-xl">Thanks!</DialogTitle>
              <p className="max-w-sm text-sm text-foreground/70">
                We really do read every submission. Your feedback helps shape future releases of LeadTrace.
              </p>
              <Button variant="outline" className="mt-2 rounded-full" onClick={() => setFeedbackOpen(false)}>
                Close
              </Button>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 font-display">
                  Help Us Improve LeadTrace
                  <span className="text-sm tracking-tight text-amber-500">★★★★★</span>
                </DialogTitle>
                <DialogDescription className="text-sm text-foreground/70">
                  Found something confusing? Missing a feature? Have an idea? We read every submission — and many
                  updates come directly from customer feedback.
                </DialogDescription>
              </DialogHeader>

              <div className="flex flex-wrap gap-2">
                {FEEDBACK_CATEGORIES.map((c) => {
                  const active = category === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCategory(active ? null : c)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      {c}
                    </button>
                  );
                })}
              </div>

              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={9}
                className="min-h-44 resize-y"
                placeholder="Describe your idea or issue… What were you trying to do? What would make it better?"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  disabled={polishing}
                  onClick={() => void improve()}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline disabled:opacity-60"
                >
                  {polishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {polishing ? "Improving…" : "Improve My Feedback"}
                </button>

                {file ? (
                  <span className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs text-foreground/70">
                    <Paperclip className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{file.name}</span>
                    <button type="button" aria-label="Remove screenshot" onClick={() => setFile(null)}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <Paperclip className="h-4 w-4" /> Attach Screenshot
                  </button>
                )}
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 5 * 1024 * 1024) return toast.error("Screenshots Must Be Under 5 MB");
                    setFile(f);
                    e.target.value = "";
                  }}
                />
              </div>

              <Button className="rounded-full" disabled={busy} onClick={() => void submit()}>
                {busy ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" /> Submitting…
                  </>
                ) : (
                  "Submit Feedback"
                )}
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Item({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted transition-colors text-left"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}