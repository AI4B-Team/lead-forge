import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandPicker } from "@/components/app/brand-picker";
import { BotTrainer } from "@/components/app/bot-trainer";
import { useWorkspaceId } from "@/hooks/use-workspace";
import { listBrands } from "@/lib/brands.functions";
import { BrainCircuit } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/brands")({
  head: () => ({
    meta: [
      { title: "Brand Training — LeadTrace" },
      { name: "description", content: "Train the LeadTrace warm-up bot on your brand, product and service knowledge before you launch a campaign." },
      { property: "og:title", content: "Brand Training — LeadTrace" },
      { property: "og:description", content: "Teach the bot your brand voice with text, dictation, files and URLs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Brands,
});

function Brands() {
  const { workspaceId } = useWorkspaceId();
  const qc = useQueryClient();
  const fetchBrands = useServerFn(listBrands);
  const [active, setActive] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["brands", workspaceId],
    queryFn: () => fetchBrands({ data: { workspaceId: workspaceId! } }),
    enabled: !!workspaceId,
  });
  const brands = data?.brands ?? [];
  const sources = data?.sources ?? {};

  useEffect(() => {
    if (!active && brands.length) setActive(brands[0].id);
  }, [brands, active]);

  const current = brands.find((b) => b.id === active);

  return (
    <div>
      <PageHeader
        title="Brands & Bot Training"
        description="Teach The Bot Your Brand Before You Build A Campaign. Every Reply Comes Only From Approved Material."
      />

      {workspaceId && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <BrandPicker workspaceId={workspaceId} value={active} onChange={setActive} label="Active Brand" />
          </CardContent>
        </Card>
      )}

      {brands.length > 1 && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          {brands.map((b) => (
            <button key={b.id} type="button" onClick={() => setActive(b.id)} className="text-left">
              <Card className={`transition ${b.id === active ? "border-primary" : "hover:border-primary/50"}`}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="font-display font-bold text-foreground">{b.name}</div>
                    <Badge variant="outline" className="text-[10px] uppercase">
                      {sources[b.id] ?? 0} Source{(sources[b.id] ?? 0) === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  {b.website && <div className="text-xs text-muted-foreground mt-1 truncate">{b.website}</div>}
                  {b.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.description}</div>}
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      {current ? (
        <BotTrainer
          key={current.id}
          brandId={current.id}
          heading={`Train The Bot On ${current.name}`}
        />
      ) : (
        <Card>
          <CardContent className="pt-10 pb-10 text-center">
            <BrainCircuit className="h-6 w-6 text-primary mx-auto" />
            <div className="font-display font-bold text-lg text-foreground mt-2">No Brands Yet</div>
            <div className="text-sm text-muted-foreground mt-1">
              Create Your First Brand Above, Then Train The Bot With Text, Dictation, Files Or URLs.
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex justify-end">
        <Button variant="outline" className="rounded-full" onClick={() => qc.invalidateQueries({ queryKey: ["brands", workspaceId] })}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
