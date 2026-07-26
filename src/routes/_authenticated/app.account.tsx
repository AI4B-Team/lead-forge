import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const searchSchema = z.object({ tab: z.enum(["profile", "security"]).optional() });

export const Route = createFileRoute("/_authenticated/app/account")({
  head: () => ({ meta: [{ title: "Account — LeadTrace" }] }),
  validateSearch: searchSchema,
  component: AccountPage,
});

function AccountPage() {
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const { user } = useAuth();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    setFullName((user.user_metadata?.full_name as string) ?? "");
    setPhone((user.user_metadata?.phone as string) ?? "");
  }, [user]);

  const saveProfile = async () => {
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, phone },
    });
    setSavingProfile(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
  };

  const savePassword = async () => {
    if (newPassword.length < 8) return toast.error("Password must be at least 8 characters");
    if (newPassword !== confirmPassword) return toast.error("Passwords do not match");
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) return toast.error(error.message);
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  };

  const sendReset = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    toast.success("Reset email sent");
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Account" description="Manage Your Profile, Security, And Preferences." />
      <Tabs
        value={tab ?? "profile"}
        onValueChange={(v) => navigate({ search: { tab: v as "profile" | "security" }, replace: true })}
      >
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base font-display">Profile</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user?.email ?? ""} disabled className="mt-1" />
              </div>
              <div>
                <Label htmlFor="full-name">Full Name</Label>
                <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1" placeholder="+1 555 555 5555" />
              </div>
              <Button className="rounded-full" onClick={saveProfile} disabled={savingProfile}>
                {savingProfile ? "Saving..." : "Save Changes"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base font-display">Change Password</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="new-pass">New Password</Label>
                <Input id="new-pass" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="confirm-pass">Confirm Password</Label>
                <Input id="confirm-pass" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" />
              </div>
              <div className="flex gap-2">
                <Button className="rounded-full" onClick={savePassword} disabled={savingPassword}>
                  {savingPassword ? "Updating..." : "Update Password"}
                </Button>
                <Button variant="outline" className="rounded-full" onClick={sendReset}>
                  Send Reset Email
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base font-display">Sessions</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Sign out of this device. You can sign back in anytime with your credentials.
              </p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/auth";
                }}
              >
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}