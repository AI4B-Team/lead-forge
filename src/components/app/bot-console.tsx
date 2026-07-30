import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Bot, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { saveBotConfig, previewBotReply } from "@/lib/bot.functions";

type Cfg = {
  vertical?: string;
  product?: string;
  tone?: string;
  faqs?: Array<{ q: string; a: string }>;
  screening_questions?: string[];
  booking_link?: string;
};

/**
 * AI Warm-Up Bot console. The bot QUALIFIES and hands off — it never closes,
 * never quotes price/coverage, and never sees an opt-out (those are intercepted
 * before the bot runs).
 */
export function BotConsole({
  campaignId,
  enabled,
  regulated,
  config,
}: {
  campaignId: string;
  enabled: boolean;
  regulated: boolean;
  config: Cfg;
}) {
  const save = useServerFn(saveBotConfig);
  const preview = useServerFn(previewBotReply);

  const [on, setOn] = useState(enabled);
  const [reg, setReg] = useState(regulated);
  const [vertical, setVertical] = useState(config.vertical ?? "");
  const [product, setProduct] = useState(config.product ?? "");
  const [tone, setTone] = useState(config.tone ?? "Warm, brief, human. No hype.");
  const [booking, setBooking] = useState(config.booking_link ?? "");
  const [screening, setScreening] = useState((config.screening_questions ?? []).join("\n"));
  const [faqs, setFaqs] = useState(
    (config.faqs ?? []).map((f) => `${f.q} | ${f.a}`).join("\n"),
  );
  const [sample, setSample] = useState("Sure, what's this about?");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const buildConfig = () => ({
    vertical: vertical.trim() || undefined,
    product: product.trim() || undefined,
    tone: tone.trim() || undefined,
    booking_link: booking.trim() || undefined,
    screening_questions: screening.split("\n").map((s) => s.trim()).filter(Boolean),
    faqs: faqs
      .split("\n")
      .map((l) => l.split("|"))
      .filter((p) => p.length >= 2)
      .map((p) => ({ q: p[0].trim(), a: p.slice(1).join("|").trim() })),
  });

  const persist = async () => {
    setBusy(true);
    try {
      await save({ data: { campaignId, bot_enabled: on, regulated_vertical: reg, bot_config: buildConfig() } });
      toast.success("Bot Settings Saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save Failed");
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    setResult(null);
    try {
      await save({ data: { campaignId, bot_enabled: on, regulated_vertical: reg, bot_config: buildConfig() } });
      const out = await preview({ data: { campaignId, message: sample } });
      setResult(
        out.action === "reply"
          ? `Bot Reply → ${out.body}`
          : `${out.action === "blocked" ? "Blocked" : "Handoff To Human"} → ${out.reason}`,
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Test Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base font-display flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" /> AI Warm-Up Bot
          <Badge variant="outline" className="text-[10px] uppercase">Qualifier · Not Closer</Badge>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Label className="text-xs">Enabled</Label>
          <Switch checked={on} onCheckedChange={setOn} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-warn/30 bg-warn/5 p-3 flex gap-2 text-xs text-muted-foreground">
          <ShieldAlert className="h-4 w-4 text-warn shrink-0 mt-0.5" />
          <div>
            STOP And HELP Are Intercepted Before The Bot Runs — It Can Never Reply Past An Opt-Out.
            Anything Outside Your Approved Answers Hands Off To A Human.
          </div>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border p-3">
          <div>
            <div className="text-sm font-semibold text-foreground">Regulated Vertical</div>
            <div className="text-xs text-muted-foreground">Insurance, Medical, Legal, Lending — Forces Handoff On Price, Coverage, Or Advice.</div>
          </div>
          <Switch checked={reg} onCheckedChange={setReg} />
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label>Vertical</Label>
            <Input value={vertical} onChange={(e) => setVertical(e.target.value)} placeholder="Roofing" />
          </div>
          <div>
            <Label>Booking Link (Optional)</Label>
            <Input value={booking} onChange={(e) => setBooking(e.target.value)} placeholder="https://cal.com/you/15min" />
          </div>
        </div>
        <div>
          <Label>What You Offer</Label>
          <Textarea rows={2} value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Free roof inspections for storm-damaged homes in Tampa." />
        </div>
        <div>
          <Label>Tone</Label>
          <Input value={tone} onChange={(e) => setTone(e.target.value)} />
        </div>
        <div>
          <Label>Screening Questions (One Per Line)</Label>
          <Textarea rows={3} value={screening} onChange={(e) => setScreening(e.target.value)} placeholder={"Do you own the home?\nWhen did the damage happen?"} />
        </div>
        <div>
          <Label>Approved FAQ Answers (One Per Line: Question | Answer)</Label>
          <Textarea rows={3} value={faqs} onChange={(e) => setFaqs(e.target.value)} placeholder="Who is this? | I'm with Acme Roofing, we do free storm inspections." />
          <div className="text-[11px] text-muted-foreground mt-1">The Bot Answers Only From These. No Invention, No Guarantees.</div>
        </div>

        <div className="rounded-xl border border-border p-3 space-y-2">
          <Label className="text-xs">Sandbox — Test A Reply (Nothing Is Sent)</Label>
          <div className="flex gap-2">
            <Input value={sample} onChange={(e) => setSample(e.target.value)} />
            <Button variant="outline" className="rounded-full" onClick={test} disabled={busy}>Test</Button>
          </div>
          {result && <div className="text-xs text-foreground bg-surface-muted rounded-lg p-2">{result}</div>}
        </div>

        <div className="text-right">
          <Button className="rounded-full" onClick={persist} disabled={busy}>Save Bot Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
}