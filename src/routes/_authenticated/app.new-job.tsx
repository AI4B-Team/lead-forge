import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageHeader } from "@/components/app/page-header";
import { Search, Landmark, Upload, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/app/new-job")({
  head: () => ({ meta: [{ title: "New Job — LeadTrace" }] }),
  component: NewJob,
});

function NewJob() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isRoot = pathname === "/app/new-job";

  if (!isRoot) return <Outlet />;

  const doors = [
    {
      to: "/app/new-job/business",
      icon: Search,
      title: "Scrape A Niche",
      body: "Type A Trade And A State. We Pull Every Small Business, Franchises Removed.",
    },
    {
      to: "/app/new-job/records",
      icon: Landmark,
      title: "Scrape Public Records",
      body: "Probates, Code Violations, Pre-Foreclosures, Tax Defaults, Vacancy Notices.",
    },
    {
      to: "/app/new-job/upload",
      icon: Upload,
      title: "Upload My List",
      body: "Already Have Data? Drop A CSV. Skip Straight To Cleaning And Campaign.",
    },
  ] as const;

  return (
    <div>
      <PageHeader
        title="Start A New Job"
        description="Three doors in. One compliant pipeline out. Pick a source to begin."
      />
      <div className="grid md:grid-cols-3 gap-5">
        {doors.map((d) => (
          <Link
            key={d.to}
            to={d.to}
            className="group rounded-2xl border border-border bg-surface p-8 hover:border-primary transition"
          >
            <div className="grid place-items-center h-12 w-12 rounded-xl bg-primary/10 text-primary">
              <d.icon className="h-5 w-5" />
            </div>
            <div className="mt-5 font-display font-bold text-xl text-foreground">{d.title}</div>
            <p className="mt-2 text-sm text-muted-foreground">{d.body}</p>
            <div className="mt-6 flex items-center gap-1 text-sm font-medium text-primary">
              Start <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}