import { PhoneIncoming, Voicemail, PhoneMissed, PhoneForwarded } from "lucide-react";
import { callEventLabel, durationLabel } from "@/lib/call-events.shared";
import { dayLabel } from "@/lib/conversation-intel";
import { cn } from "@/lib/utils";

/**
 * A voice item on the lead thread. Deliberately not an SMS bubble: the lead
 * called, they did not text, and the operator needs to see that at a glance.
 */
export function VoiceMessageItem({
  event,
  createdAt,
  recordingUrl,
  seconds,
  transcript,
  className,
}: {
  event: string | null;
  createdAt: string;
  recordingUrl: string | null;
  seconds: number | null;
  transcript: string | null;
  className?: string;
}) {
  const Icon =
    event === "missed" ? PhoneMissed : event === "forwarded" ? PhoneForwarded : event === "answered" ? PhoneIncoming : Voicemail;
  return (
    <div className={cn("flex justify-start", className)}>
      <div className="max-w-[86%] w-full rounded-2xl rounded-bl-sm border border-warn/40 bg-warn/5 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-warn/15 text-warn shrink-0">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-warn">
              Inbound Call · {callEventLabel(event)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {new Date(createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {dayLabel(createdAt)}
              {seconds ? ` · ${durationLabel(seconds)}` : ""}
            </div>
          </div>
        </div>

        {recordingUrl && (
          <audio controls preload="none" src={recordingUrl} className="mt-2 h-8 w-full">
            <track kind="captions" />
          </audio>
        )}

        {transcript ? (
          <div className="mt-2 rounded-lg bg-background/70 px-2.5 py-2">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Transcript</div>
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-foreground">{transcript}</p>
          </div>
        ) : (
          <p className="mt-2 text-[11px] text-muted-foreground">
            No Transcript Yet — It Appears Here Once The Recording Is Processed.
          </p>
        )}
      </div>
    </div>
  );
}