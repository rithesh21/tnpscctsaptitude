import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyHistory } from "@/lib/tests.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/history")({
  head: () => ({ meta: [{ title: "History — TNPSC101" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const fn = useServerFn(getMyHistory);
  const { data, isLoading } = useQuery({ queryKey: ["history"], queryFn: () => fn() });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Test history</h1>
      <Card>
        <CardContent className="p-0">
          {(data ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No tests yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Score</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {data!.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 capitalize">{t.test_type}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(t.started_at)}</td>
                    <td className="px-4 py-3 font-mono">{t.status === "submitted" ? `${t.score}/${t.total_questions}` : "—"}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{t.status.replace("_", " ")}</td>
                    <td className="px-4 py-3 text-right">
                      {t.status === "submitted" && (
                        <Link to="/test/$testId/result" params={{ testId: t.id }}>
                          <Button size="sm" variant="ghost">Review</Button>
                        </Link>
                      )}
                      {t.status === "in_progress" && (
                        <Link to="/test/$testId" params={{ testId: t.id }}>
                          <Button size="sm">Resume</Button>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
