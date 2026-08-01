import { useState } from "react";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useWorkspaceId, useCreateWorkspace } from "@/hooks/use-workspace";

export function WorkspaceSwitcher() {
  const { workspaceId, workspaceName, workspaces, switchWorkspace } = useWorkspaceId();
  const { create, creating } = useCreateWorkspace();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  const onCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    try {
      await create(trimmed);
      toast.success(`Switched To ${trimmed}`);
      setOpen(false);
      setName("");
    } catch {
      toast.error("Could Not Create Workspace");
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2 text-sm font-medium text-muted-foreground hover:text-foreground"
          >
            <span className="max-w-[180px] truncate">{workspaceName ?? "Workspace"}</span>
            <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Workspaces
          </DropdownMenuLabel>
          {workspaces.map((w) => (
            <DropdownMenuItem key={w.id} onSelect={() => switchWorkspace(w.id)} className="gap-2">
              <Check className={`h-3.5 w-3.5 ${w.id === workspaceId ? "opacity-100" : "opacity-0"}`} />
              <span className="truncate">{w.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setOpen(true)} className="gap-2">
            <Plus className="h-3.5 w-3.5" /> New Workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Create Workspace</DialogTitle>
            <DialogDescription>
              Leads, jobs, numbers, and campaigns stay separate per workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="ws-name">Workspace Name</Label>
            <Input
              id="ws-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Roofing Division"
              onKeyDown={(e) => { if (e.key === "Enter") void onCreate(); }}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void onCreate()} disabled={creating || !name.trim()}>
              {creating && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
