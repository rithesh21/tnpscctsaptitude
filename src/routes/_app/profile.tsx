import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({ meta: [{ title: "Profile — Korangu" }] }),
  component: Profile,
});

function Profile() {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="mx-auto max-w-xl">
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
            <Input id="target" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g., SBI PO, IBPS Clerk, SSC CGL" />
          </div>
          <Button onClick={save} disabled={loading}>{loading ? "Saving…" : "Save"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
