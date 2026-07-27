import { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import {
  User,
  Settings,
  CreditCard,
  Shield,
  Power,
  UserPlus,
  Zap,
  Users,
  BadgeCheck,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { meIsSuperAdmin } from "@/lib/admin.functions";

export function ProfileDropdown({ className }: { className?: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const fetchIsAdmin = useServerFn(meIsSuperAdmin);
  const { data: admin } = useQuery({
    queryKey: ["me-is-super-admin"],
    queryFn: () => fetchIsAdmin(),
  });

  const userName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "User";
  const userEmail = user?.email || "";
  const initials = userName.slice(0, 2).toUpperCase();

  const go = (path: string) => {
    setOpen(false);
    navigate({ to: path });
  };

  const handleSignOut = async () => {
    setOpen(false);
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-label="Open account menu"
          className={cn(
            "flex items-center justify-center p-0.5 rounded-full border-2 border-primary hover:bg-surface-muted transition-colors",
            className,
          )}
        >
          <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
            {initials || <User className="h-4 w-4" />}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        className="w-80 p-0 bg-background shadow-xl border z-50"
      >
        <div className="p-4 flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
            {initials || <User className="h-6 w-6" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{userName}</p>
            <p className="text-sm text-muted-foreground truncate">{userEmail}</p>
          </div>
        </div>

        <div className="px-4 pb-4 space-y-2">
          <Button className="w-full gap-2 rounded-full" onClick={() => go("/app/billing")}>
            <Zap className="h-4 w-4" /> Top Up Credits
          </Button>
          <Button variant="outline" className="w-full gap-2 rounded-full" onClick={() => go("/app/settings")}>
            <UserPlus className="h-4 w-4" /> Invite Teammate
          </Button>
        </div>

        <div className="border-t border-border py-2">
          <MenuItem icon={<Settings className="h-4 w-4" />} label="Account" onClick={() => go("/app/account")} />
          <MenuItem icon={<Shield className="h-4 w-4" />} label="Security" onClick={() => go("/app/account?tab=security")} />
          <MenuItem icon={<CreditCard className="h-4 w-4" />} label="Billing" onClick={() => go("/app/billing")} />
          <MenuItem icon={<Users className="h-4 w-4" />} label="Team" onClick={() => go("/app/team")} />
          <MenuItem icon={<Settings className="h-4 w-4" />} label="Workspace Settings" onClick={() => go("/app/settings")} />
          <MenuItem icon={<BadgeCheck className="h-4 w-4" />} label="10DLC Registration" onClick={() => go("/app/registration")} />
          <MenuItem icon={<ShieldCheck className="h-4 w-4" />} label="Compliance" onClick={() => go("/app/compliance")} />
          {admin?.isSuperAdmin && (
            <MenuItem icon={<ShieldAlert className="h-4 w-4" />} label="Admin Console" onClick={() => go("/app/admin")} />
          )}
        </div>

        <div className="border-t border-border p-4">
          <Button
            variant="destructive"
            className="w-full gap-2"
            onClick={handleSignOut}
          >
            <Power className="h-4 w-4" /> Log Out
          </Button>
        </div>

        <div className="border-t border-border px-4 py-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Link to="/compliance" onClick={() => setOpen(false)} className="hover:text-foreground">Terms</Link>
            <span>|</span>
            <Link to="/compliance" onClick={() => setOpen(false)} className="hover:text-foreground">Privacy</Link>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted transition-colors text-left"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}