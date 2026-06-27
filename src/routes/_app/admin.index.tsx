import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminDashboard } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/")({
  head: () => ({ meta: [{ title: "Admin — TNPSC101" }] }),
  component: Overview,
});

function Overview() {
  const fn = useServerFn(adminDashboard);
  const { data, isLoading } = useQuery({ queryKey: ["admin-dash"], queryFn: () => fn() });
  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total questions" value={data.totalQuestions.toLocaleString()} />
        <Stat label="Total users" value={data.totalUsers.toLocaleString()} />
        <Stat label="Tests today" value={data.testsToday.toLocaleString()} />
      </div>

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
