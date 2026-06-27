import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminDashboard, adminListAdmins, adminGrantAdmin, adminRevokeAdmin } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { ShieldPlus, Trash2 } from "lucide-react";

const OWNER_EMAIL = "ritheshmarshal21@gmail.com";

export const Route = createFileRoute("/_app/admin/")({
  head: () => ({ meta: [{ title: "Admin — TNPSC101" }] }),
  component: Overview,
});

function Overview() {
  const fn = useServerFn(adminDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["admin-dash"], queryFn: () => fn() });
  const { user } = useAuth();
  const isOwner = (user?.email ?? "").toLowerCase() === OWNER_EMAIL;

  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total questions" value={data.totalQuestions.toLocaleString()} />
        <Stat label="Total users" value={data.totalUsers.toLocaleString()} />
        <Stat label="Tests today" value={data.testsToday.toLocaleString()} />
      </div>

      {isOwner && <SuggestForAdmin />}

      <Card>
        <CardHeader><CardTitle>Questions per topic</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Topic</th>
                <th className="px-4 py-2">Unit</th>
                <th className="px-4 py-2">Easy</th>
                <th className="px-4 py-2">Medium</th>
                <th className="px-4 py-2">Hard</th>
                <th className="px-4 py-2">Very hard</th>
                <th className="px-4 py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {data.topicStats.map((t) => (
                <tr key={t.name} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{t.name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{t.unit}</td>
                  <td className="px-4 py-2 font-mono">{t.byDiff.easy ?? 0}</td>
                  <td className="px-4 py-2 font-mono">{t.byDiff.medium ?? 0}</td>
                  <td className="px-4 py-2 font-mono">{t.byDiff.hard ?? 0}</td>
                  <td className="px-4 py-2 font-mono">{t.byDiff.very_hard ?? 0}</td>
                  <td className="px-4 py-2 font-mono font-semibold">{t.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Next Main Test</CardTitle></CardHeader>
          <CardContent>
            {data.nextMain ? (
              <>
                <div>{formatDate(data.nextMain.scheduled_date)}</div>
                <div className="text-sm text-muted-foreground">
                  Opens {formatDate(data.nextMain.opens_at)} · closes {formatDate(data.nextMain.closes_at)}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No Main Test scheduled — create one in the Main Tests tab.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Last Main Test</CardTitle></CardHeader>
          <CardContent>
            {data.lastMain ? (
              <>
                <div>{formatDate(data.lastMain.scheduled_date)}</div>
                <div className="text-sm text-muted-foreground">{data.lastMainParticipants} participants</div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No scored Main Tests yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SuggestForAdmin() {
  const listFn = useServerFn(adminListAdmins);
  const grantFn = useServerFn(adminGrantAdmin);
  const revokeFn = useServerFn(adminRevokeAdmin);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");

  const { data: admins = [] } = useQuery({ queryKey: ["admin-list"], queryFn: () => listFn() });

  const grant = useMutation({
    mutationFn: (e: string) => grantFn({ data: { email: e } }),
    onSuccess: (res: any) => {
      if (res?.ok) {
        toast.success("Admin access granted");
        setEmail("");
        qc.invalidateQueries({ queryKey: ["admin-list"] });
      } else {
        toast.error(res?.reason ?? "Could not grant admin");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: (e: string) => revokeFn({ data: { email: e } }),
    onSuccess: () => {
      toast.success("Admin access revoked");
      qc.invalidateQueries({ queryKey: ["admin-list"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    grant.mutate(email.trim());
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldPlus className="h-5 w-5 text-primary" />
          Suggest for admin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Grant admin access to anyone who has already signed up on TNPSC101. Enter their Gmail / login email below.
        </p>
        <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
          <Input
            type="email"
            placeholder="user@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={grant.isPending}>
            {grant.isPending ? "Granting…" : "Grant admin"}
          </Button>
        </form>

        <div>
          <div className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Current admins</div>
          <div className="flex flex-wrap gap-2">
            {admins.length === 0 && <span className="text-sm text-muted-foreground">No admins listed.</span>}
            {admins.map((a) => {
              const isOwnerRow = a.email.toLowerCase() === OWNER_EMAIL;
              return (
                <div key={a.email} className="flex items-center gap-1 rounded-full border border-border bg-secondary py-1 pl-3 pr-1 text-sm">
                  <span>{a.email}</span>
                  {isOwnerRow ? (
                    <Badge variant="outline" className="ml-1">owner</Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={() => revoke.mutate(a.email)}
                      disabled={revoke.isPending}
                      aria-label={`Revoke ${a.email}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-1 font-mono text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
