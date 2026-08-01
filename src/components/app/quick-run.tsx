import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

type RecordType = "business" | "records" | "upload";

/** Quick-run bar (spec §18): primary action as hero — jump straight into a prefilled job. */
export function QuickRun() {
  const navigate = useNavigate();
  const [type, setType] = useState<RecordType>("business");
  const [niche, setNiche] = useState("");
  const [location, setLocation] = useState("");

  const run = () => {
    if (type === "upload") {
      void navigate({ to: "/app/new-job/upload" });
      return;
    }
    if (type === "records") {
      void navigate({ to: "/app/new-job/records" });
      return;
    }
    void navigate({
      to: "/app/new-job/business",
      search: {
        ...(niche.trim() ? { niche: niche.trim() } : {}),
        ...(location.trim() ? { location: location.trim() } : {}),
      },
    });
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="grid gap-3 md:grid-cols-[190px_1fr_1fr_auto] md:items-end">
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Record Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as RecordType)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="business">Business Search</SelectItem>
                <SelectItem value="records">Public Records</SelectItem>
                <SelectItem value="upload">Upload A List</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="quick-niche" className="text-xs uppercase tracking-wider text-muted-foreground">
              Niche
            </Label>
            <Input
              id="quick-niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="HVAC Companies"
              disabled={type !== "business"}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="quick-location" className="text-xs uppercase tracking-wider text-muted-foreground">
              Location
            </Label>
            <Input
              id="quick-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Hillsborough County, FL"
              disabled={type !== "business"}
              className="mt-1"
              onKeyDown={(e) => { if (e.key === "Enter") run(); }}
            />
          </div>
          <Button className="rounded-full" onClick={run}>
            <Play className="mr-1 h-4 w-4" /> Start Job
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
