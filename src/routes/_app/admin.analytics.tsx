import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminAnalytics } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/analytics")({
  head: () => ({ meta: [{ title: "Analytics — Admin" }] }),
  component: Analytics,
});

function Analytics() {
  const fn = useServerFn(adminAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["admin-analytics"], queryFn: () => fn() });
  if (isLoading || !data) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Most-missed questions</CardTitle></CardHeader>
        <CardContent className="p-0">
          {data.missed.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">Not enough attempts yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Question</th>
                  <th className="px-4 py-2">Topic</th>
                  <th className="px-4 py-2">Attempts</th>
                  <th className="px-4 py-2">Miss rate</th>
                </tr>
              </thead>
              <tbody>
                {data.missed.map((m) => (
                  <tr key={m.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 max-w-md truncate">{m.stem}</td>
                    <td className="px-4 py-2 text-muted-foreground">{m.topic}</td>
                    <td className="px-4 py-2 font-mono">{m.total}</td>
                    <td className="px-4 py-2 font-mono text-destructive">{Math.round(m.missRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Main Test participation</CardTitle></CardHeader>
        <CardContent>
          {data.participation.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {data.participation.map((p) => (
                <li key={p.date} className="flex items-center justify-between text-sm">
                  <span>{formatDate(p.date)}</span>
                  <span className="font-mono">{p.count}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
