import { Badge } from "@/components/ui/badge";
import { statusLabel, type JobStatus } from "@/lib/mock-data";

const statusClasses: Record<JobStatus, string> = {
  ready: "bg-success/10 text-success border-success/20",
  scrubbing: "bg-warn/10 text-warn border-warn/20",
  skiptracing: "bg-warn/10 text-warn border-warn/20",
  enriching: "bg-warn/10 text-warn border-warn/20",
  scraping: "bg-warn/10 text-warn border-warn/20",
  queued: "bg-muted text-muted-foreground border-border",
  failed: "bg-danger/10 text-danger border-danger/20",
};

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge variant="outline" className={`${statusClasses[status]} font-medium`}>
      {statusLabel(status)}
    </Badge>
  );
}
