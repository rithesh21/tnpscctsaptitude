import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMainEvents, getLeaderboard } from "@/lib/main-test.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { formatDate } from "@/lib/format";
import { Trophy } from "lucide-react";

export const Route = createFileRoute("/_app/leaderboard")({
  head: () => ({ meta: [{ title: "Leaderboard — Korangu" }] }),
  component: LB,
});

function LB() {
  const listFn = useServerFn(listMainEvents);
  const lbFn = useServerFn(getLeaderboard);
  const { data: events } = useQuery({ queryKey: ["main-events-pub"], queryFn: () => listFn() });
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    if (events && events.length && !eventId) {
      const now = new Date();
      const past = events.filter((e) => new Date(e.closes_at) < now);
      const live = events.filter((e) => new Date(e.opens_at) <= now && new Date(e.closes_at) >= now);
      setEventId((live[0] ?? past[0] ?? events[0]).id);
    }
  }, [events, eventId]);

  const { data: lb } = useQuery({
    queryKey: ["lb", eventId],
    queryFn: () => lbFn({ data: { eventId: eventId! } }),
    enabled: !!eventId,
    refetchInterval: 30000,
  });

  return (
    <div className="space-y-4">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Trophy className="h-6 w-6 text-accent-foreground" /> Leaderboard
      </h1>
      {events && events.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {events.map((e) => (
            <button
              key={e.id}
              onClick={() => setEventId(e.id)}
              className={`rounded-full border px-3 py-1 text-sm transition-colors ${eventId === e.id ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-secondary"}`}
            >
              {e.title}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No Main Test events yet.</p>
      )}

      {lb && (
        <Card>
          <CardHeader>
            <CardTitle>{lb.event.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{formatDate(lb.event.opens_at)} — {lb.event.scored ? "Final results" : "Live (updates every 30s)"}</p>
          </CardHeader>
          <CardContent className="p-0">
            {lb.entries.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No attempts yet.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Rank</th>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Score</th>
                    <th className="px-4 py-2">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {lb.entries.map((row) => (
                    <tr key={row.rank} className={`border-b border-border last:border-0 ${row.isMe ? "bg-primary/5 font-medium" : ""}`}>
                      <td className="px-4 py-2 font-mono">#{row.rank}</td>
                      <td className="px-4 py-2">{row.name}{row.isMe && <span className="ml-2 text-xs text-primary">you</span>}</td>
                      <td className="px-4 py-2 font-mono">{row.score}/25</td>
                      <td className="px-4 py-2 font-mono text-muted-foreground">{Math.floor(row.timeSeconds / 60)}m {row.timeSeconds % 60}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
