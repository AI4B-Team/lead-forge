import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Sparkles, Plus, Upload, HardDrive, Send, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MarkerHighlight } from "@/components/marketing/marker-highlight";

const ROTATING = [
  "HVAC contractors in Georgia, remove franchises…",
  "New probate filings in Hillsborough County FL, last 90 days…",
  "Roofers in every county in Texas, skip trace and scrub…",
  "Upload my CSV and clean it for a campaign…",
];

export function PromptHero() {
  const search = useSearch({ strict: false }) as { prompt?: string };
  const navigate = useNavigate();
  const [value, setValue] = useState(search.prompt ?? "");
  const [focused, setFocused] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const stopTypingRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync prefill from ?prompt= (template click)
  useEffect(() => {
    if (search.prompt && search.prompt !== value) {
      setValue(search.prompt);
      stopTypingRef.current = true;
      setPlaceholder("");
      const el = document.getElementById("prompt-hero-box");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search.prompt]);

  // Ghost typing effect
  useEffect(() => {
    if (stopTypingRef.current) return;
    let exampleIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (stopTypingRef.current) return;
      const current = ROTATING[exampleIdx];
      if (!deleting) {
        charIdx++;
        setPlaceholder(current.slice(0, charIdx));
        if (charIdx === current.length) {
          deleting = true;
          timer = setTimeout(tick, 1600);
          return;
        }
        timer = setTimeout(tick, 45);
      } else {
        charIdx--;
        setPlaceholder(current.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          exampleIdx = (exampleIdx + 1) % ROTATING.length;
        }
        timer = setTimeout(tick, 25);
      }
    };
    timer = setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, []);

  const stopTyping = () => {
    stopTypingRef.current = true;
    setPlaceholder("");
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length) setFiles((f) => [...f, ...dropped]);
  };

  const submit = () => {
    if (!value.trim() && files.length === 0) return;
    navigate({ to: "/start" });
  };

  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)",
      }}
    >
      {/* Dot grid texture */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35] pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, #d4d4d8 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
        }}
      />
      <div className="relative mx-auto max-w-[1240px] px-6 pt-16 pb-14 md:pt-24 md:pb-20 text-center">
        <div className="inline-flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-[0.18em]">
          <Sparkles className="h-3.5 w-3.5" />
          Leads To Deals, On Autopilot
        </div>
        <h1
          className="mx-auto mt-6 font-body font-extrabold text-foreground leading-[1.05] tracking-tight"
          style={{
            fontSize: "clamp(34px, 5.4vw, 78px)",
            whiteSpace: "nowrap",
          }}
        >
          Find Them. <MarkerHighlight>Reach</MarkerHighlight> Them. Close Them.
        </h1>
        <style>{`
          @media (max-width: 760px) {
            h1[data-hero] { white-space: normal !important; }
          }
        `}</style>
        <p className="mt-5 text-lg text-muted-foreground">
          Describe Who You Want To Reach And LeadTrace Builds The Whole Campaign.
        </p>

        {/* Smart prompt box */}
        <div
          id="prompt-hero-box"
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className="mx-auto mt-8 w-full max-w-[820px] rounded-[22px] bg-white text-left transition"
          style={{
            border: `2px solid ${dragOver ? "#16A34A" : "#CC0000"}`,
            boxShadow: "0 20px 40px -20px rgba(204,0,0,0.25)",
          }}
        >
          <textarea
            value={value}
            onFocus={stopTyping}
            onChange={(e) => {
              stopTyping();
              setValue(e.target.value);
            }}
            placeholder={focused || value ? "Describe who you want to reach, paste a website, or upload a list…" : placeholder || "Describe who you want to reach, paste a website, or upload a list…"}
            onBlur={() => setFocused(false)}
            onFocusCapture={() => setFocused(true)}
            rows={4}
            className="w-full resize-none rounded-t-[20px] bg-transparent px-5 pt-4 pb-2 text-base text-foreground placeholder:text-muted-foreground/70 outline-none"
          />
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 px-5 pb-2">
              {files.map((f, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-medium"
                >
                  {f.name}
                  <button
                    type="button"
                    onClick={() => setFiles((arr) => arr.filter((_, j) => j !== i))}
                    className="hover:text-emerald-900"
                    aria-label="Remove File"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between px-3 pb-3 pt-1">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="grid place-items-center h-10 w-10 rounded-full border border-border bg-surface hover:bg-surface-muted text-foreground"
                aria-label="Add Attachment"
              >
                <Plus className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-2" /> Upload File
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <HardDrive className="h-4 w-4 mr-2" /> Add From Drive
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.xls,.txt"
              className="hidden"
              onChange={(e) => {
                const list = Array.from(e.target.files ?? []);
                if (list.length) setFiles((f) => [...f, ...list]);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold px-5 h-10 text-sm shadow-sm"
            >
              <Send className="h-4 w-4" />
              Build My List
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}