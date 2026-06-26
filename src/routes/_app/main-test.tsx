import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMainEvents, startMainTest } from "@/lib/main-test.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/main-test")({
  head: () => ({ meta: [{ title: "Main Test — Korangu" }] }),
  component: MainTestPage,
});

function MainTestPage() {
  const navigate = useNavigate();
  const listFn = useServerFn(listMainEvents);
  const startFn = useServerFn(startMainTest);
  const { data, isLoading } = useQuery({ queryKey: ["main-events"], queryFn: () => listFn() });

  const startMut = useMutation({
    mutationFn: (eventId: string) => startFn({ data: { eventId } }),
    onSuccess: (res) => navigate({ to: "/test/$testId", params: { testId: res.testId } }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;

  const now = new Date();
  const upcoming = (data ?? []).filter((e) => new Date(e.opens_at) > now);
  const live = (data ?? []).filter((e) => new Date(e.opens_at) <= now && new Date(e.closes_at) >= now);
  const past = (data ?? []).filter((e) => new Date(e.closes_at) < now);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Main Test</h1>

      {live.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-success">Live now</h2>
          <div className="space-y-3">
            {live.map((e) => (
              <Card key={e.id} className="border-2 border-success/30 bg-success/5">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
                  <div>
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-xs text-muted-foreground">Closes {formatDate(e.closes_at)}</div>
                  </div>
                  <Button onClick={() => startMut.mutate(e.id)} disabled={startMut.isPending}>
                    Take test
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming Main Tests scheduled.</p>
        ) : (
          <div className="space-y-3">
            {upcoming.map((e) => (
              <Card key={e.id}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-xs text-muted-foreground">Opens {formatDate(e.opens_at)}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Past</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">No past events.</p>
        ) : (
          <div className="space-y-3">
            {past.map((e) => (
              <Card key={e.id}>
                <CardContent className="flex items-center justify-between p-5">
                  <div>
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-xs text-muted-foreground">Closed {formatDate(e.closes_at)}</div>
                  </div>
                  <a href={`/leaderboard?event=${e.id}`}>
                    <Button variant="outline" size="sm">View leaderboard</Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
