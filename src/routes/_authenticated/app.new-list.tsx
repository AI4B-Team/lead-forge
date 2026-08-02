import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Search, Landmark, Upload, ArrowRight, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/new-list")({
  head: () => ({ meta: [{ title: "New List — LeadTrace" }] }),
  component: NewJob,
});

const generateDoors = [
  {
    to: "/app/assistant",
    icon: Sparkles,
    title: "AI Assistant",
    body: "Describe your ideal leads. AI builds the search for you.",
  },
  {
    to: "/app/new-list/business",
    icon: Search,
    title: "Business Search",
    body: "Find businesses by industry and location.",
  },
  {
    to: "/app/new-list/records",
    icon: Landmark,
    title: "Public Records",
    body: "Search probates, code violations, tax defaults, and more.",
  },
] as const;

const importDoors = [
  {
    to: "/app/new-list/upload",
    icon: Upload,
    title: "Import List",
    body: "Import your CSV for cleaning, enrichment, and outreach.",
  },
] as const;

function DoorCard({ door }: { door: (typeof generateDoors)[number] | (typeof importDoors)[number] }) {
  return (
    <Link
      key={door.to}
      to={door.to}
      className="group rounded-2xl border border-border bg-surface p-8 hover:border-primary transition"
    >
      <div className="flex items-center gap-4">
        <div className="grid place-items-center h-12 w-12 shrink-0 rounded-xl bg-primary/10 text-primary">
          <door.icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 font-display font-bold text-xl text-foreground whitespace-nowrap truncate">
          {door.title}
        </div>
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{door.body}</p>
      <div className="mt-6 flex items-center gap-1 text-sm font-medium text-primary">
        Start <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}


function NewJob() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = pathname === "/app/new-list";

  if (!isRoot) return <Outlet />;

  return (
    <div>
      <PageHeader
        title="Start A New List"
        description="Three doors in. One compliant pipeline out. Pick a source to begin."
      />
      <div className="space-y-10">
        <section>
          <h2 className="font-display font-bold text-lg text-foreground mb-4">Generate New Leads</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {generateDoors.map((d) => (
              <DoorCard key={d.to} door={d} />
            ))}
          </div>
        </section>

        <section>
          <h2 className="font-display font-bold text-lg text-foreground mb-4">Use Existing Data</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {importDoors.map((d) => (
              <DoorCard key={d.to} door={d} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
