import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CircleHelp, BookOpen, PlayCircle, MessageSquarePlus, LifeBuoy } from "lucide-react";
import { toast } from "sonner";
import { submitFeedback } from "@/lib/help.functions";

/** Help icon in the app header: Help · Tour · Tutorials · Feedback. */
export function HelpMenu({ onStartTour }: { onStartTour: () => void }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const send = useServerFn(submitFeedback);

  const go = (path: string) => {
    setOpen(false);
    navigate({ to: path });
  };

  const submit = async () => {
    if (body.trim().length < 3) return toast.error("Tell Us A Little More");
    setBusy(true);
    try {
      await send({ data: { body } });
      setBody("");
      setFeedbackOpen(false);
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
              setFeedbackOpen(true);
            }}
          />
        </PopoverContent>
      </Popover>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Send Feedback</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            What would make your lead pipeline work better? We read every note.
          </p>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            placeholder="Tell us what's working or what's missing…"
          />
          <Button className="rounded-full" disabled={busy} onClick={submit}>
            Send Feedback
          </Button>
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