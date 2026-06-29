import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getMyNotifyPrefs, updateMyNotifyPrefs } from "@/lib/news.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [
      { title: "Profile — TNPSC101" },
      { name: "description", content: "Manage your TNPSC101 profile, target exam, and email notification preferences." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

  const prefsFn = useServerFn(getMyNotifyPrefs);
  const setPrefsFn = useServerFn(updateMyNotifyPrefs);
  const { data: prefs } = useQuery({ queryKey: ["notify-prefs"], queryFn: () => prefsFn() });

  const togglePref = useMutation({
    mutationFn: (v: boolean) => setPrefsFn({ data: { notify_email: v } }),
    onSuccess: (_d, v) => {
      qc.setQueryData(["notify-prefs"], { notify_email: v });
      toast.success(v ? "Email updates turned on" : "Email updates turned off");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, target_exam").eq("id", user.id).maybeSingle().then(({ data }) => {
      setName(data?.name ?? "");
      setTarget(data?.target_exam ?? "");
    });
  }, [user]);

  async function save() {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({ name, target_exam: target }).eq("id", user.id);
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="sr-only">Profile</h1>
      <Card>
        <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Email</Label>
            <Input value={user?.email ?? ""} disabled />
          </div>
          <div>
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="target">Target exam (optional)</Label>
            <Input id="target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g., TNPSC Group 2, SBI PO" />
          </div>
          <Button onClick={save} disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="font-medium">Email me about Saturday Main Test &amp; news</div>
              <div className="text-sm text-muted-foreground">
                Get reminders when the weekly Main Test opens and when new announcements are posted.
              </div>
            </div>
            <Switch
              checked={prefs?.notify_email ?? true}
              onCheckedChange={(v) => togglePref.mutate(v)}
              disabled={togglePref.isPending}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
