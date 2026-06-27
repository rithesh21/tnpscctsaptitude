import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardInfo, startPracticeTest } from "@/lib/tests.functions";
import { getMyMainStatus } from "@/lib/main-test.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Trophy, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TNPSC101" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const dashFn = useServerFn(getDashboardInfo);
  const mainFn = useServerFn(getMyMainStatus);
  const startFn = useServerFn(startPracticeTest);

  const { data: dash, isLoading } = useQuery({ queryKey: ["dashboard"], queryFn: () => dashFn() });
  const { data: main } = useQuery({ queryKey: ["main-status"], queryFn: () => mainFn() });

  const startMut = useMutation({
    mutationFn: () => startFn({ data: { timeLimitMinutes: null } }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      navigate({ to: "/test/$testId", params: { testId: res.testId } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  const remaining = (dash?.dailyCap ?? 10) - (dash?.takenToday ?? 0);
  const mainOpen = main?.next && new Date(main.next.opens_at) <= new Date() && new Date(main.next.closes_at) >= new Date();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Pick up where you left off.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Practice Test</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {remaining > 0
                ? `${remaining} of ${dash?.dailyCap} practice tests left today.`
                : "Daily limit reached. Come back tomorrow."}
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => navigate({ to: "/practice/new" })} disabled={remaining <= 0}>
                Start with options
              </Button>
              <Button variant="outline" onClick={() => startMut.mutate()} disabled={remaining <= 0 || startMut.isPending}>
                Quick start
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-accent-foreground" /> Saturday Main Test</CardTitle>
          </CardHeader>
          <CardContent>
            {main?.next ? (
              <>
                <p className="text-sm text-muted-foreground">
                  {mainOpen ? "Open now — take the ranked test!" : `Opens ${formatDate(main.next.opens_at)}`}
                </p>
                <div className="mt-4">
                  <Link to="/main-test">
                    <Button variant={mainOpen ? "default" : "outline"}>
                      {mainOpen ? "Take Main Test" : "Details"}
                    </Button>
                  </Link>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No upcoming Main Test scheduled yet.</p>
            )}
            {main?.myRank && (
              <p className="mt-3 text-sm">
                Last week: <span className="font-semibold">#{main.myRank.rank}</span> ({main.myRank.score}/25, top {Math.round(100 - main.myRank.percentile)}%)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent tests</CardTitle>
        </CardHeader>
        <CardContent>
          {(dash?.recent ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No tests yet. Start one above.</p>
          ) : (
            <ul className="divide-y divide-border">
              {dash!.recent.map((t) => (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium capitalize">{t.test_type} test</div>
                    <div className="text-xs text-muted-foreground">{t.submitted_at ? formatDate(t.submitted_at) : "—"}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">
                      {t.score} / {t.total_questions}
                    </span>
                    <Link to="/test/$testId/result" params={{ testId: t.id }}>
                      <Button variant="ghost" size="sm">Review</Button>
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
