import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getNegativeKeywords, setNegativeKeywords } from "@/lib/compliance.functions";
import { DEFAULT_NEGATIVE_KEYWORDS } from "@/lib/negative-keywords";

/**
 * Words that halt a sequence on sight. Separate from STOP handling: these are
 * the legal-risk phrases where the right move is to stop texting and never send
 * another word, not to reply with a confirmation.
 */
export function NegativeKeywordsCard({ workspaceId }: { workspaceId: string | null | undefined }) {
  const load = useServerFn(getNegativeKeywords);
  const save = useServerFn(setNegativeKeywords);
  const [keywords, setKeywords] = useState<string[]>(DEFAULT_NEGATIVE_KEYWORDS);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["negative-keywords", workspaceId],
    queryFn: () => load({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });

  useEffect(() => {
    if (data?.keywords) setKeywords(data.keywords);
  }, [data]);

  async function commit(next: string[]) {
    if (!workspaceId) return;
    setBusy(true);
    try {
      const res = await save({ data: { workspaceId, keywords: next } });
      setKeywords(res.keywords);
      toast.success("Negative keywords saved.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function add() {
    const word = draft.trim().toLowerCase();
    if (word.length < 2) return;
    if (keywords.includes(word)) {
      setDraft("");
      return;
    }
    setDraft("");
    void commit([...keywords, word]);
  }

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base font-display">Negative Keywords</CardTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          When an inbound reply contains one of these words, we suppress the contact and stop their
          sequence immediately — no bot reply, no next drip step.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </span>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {keywords.map((k) => (
                <Badge key={k} variant="outline" className="gap-1 py-1">
                  {k}
                  <button
                    type="button"
                    aria-label={`Remove ${k}`}
                    disabled={busy}
                    onClick={() => void commit(keywords.filter((x) => x !== k))}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    add();
                  }
                }}
                placeholder="Add a word, e.g. litigation"
                aria-label="Add a negative keyword"
                className="max-w-xs"
                disabled={busy}
              />
              <Button variant="outline" onClick={add} disabled={busy || draft.trim().length < 2}>
                Add
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => void commit(DEFAULT_NEGATIVE_KEYWORDS)}
              >
                Reset To Defaults
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
