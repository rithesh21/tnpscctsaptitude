import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMainEvents, adminCreateMainEvent, adminScoreMainEvent } from "@/lib/main-test.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/main-tests")({
  head: () => ({ meta: [{ title: "Main Tests — Admin" }] }),
  component: AdminMainTests,
});

function nextSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

function AdminMainTests() {
  const qc = useQueryClient();
  const listFn = useServerFn(listMainEvents);
  const createFn = useServerFn(adminCreateMainEvent);
  const scoreFn = useServerFn(adminScoreMainEvent);
  const { data } = useQuery({ queryKey: ["main-events-admin"], queryFn: () => listFn() });

  const [date, setDate] = useState(nextSaturday());
  const [opens, setOpens] = useState("10:00");
  const [closes, setCloses] = useState("13:00");
  const [duration, setDuration] = useState(45);
  const [newR, setNewR] = useState(0.7);
  const [repR, setRepR] = useState(0.3);

  const createMut = useMutation({
    mutationFn: () => createFn({
      data: {
        scheduled_date: date,
        opens_at: new Date(`${date}T${opens}:00`).toISOString(),
        closes_at: new Date(`${date}T${closes}:00`).toISOString(),
        duration_minutes: duration,
        new_question_ratio: newR,
        repeat_question_ratio: repR,
      },
    }),
    onSuccess: () => { toast.success("Created"); qc.invalidateQueries({ queryKey: ["main-events-admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const scoreMut = useMutation({
    mutationFn: (id: string) => scoreFn({ data: { eventId: id } }),
    onSuccess: (r) => { toast.success(`Scored ${r.scored} entries`); qc.invalidateQueries({ queryKey: ["main-events-admin"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Schedule next Main Test</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div><Label className="text-xs">Opens (local)</Label><Input type="time" value={opens} onChange={(e) => setOpens(e.target.value)} /></div>
            <div><Label className="text-xs">Closes (local)</Label><Input type="time" value={closes} onChange={(e) => setCloses(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><Label className="text-xs">Duration (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
            <div><Label className="text-xs">New ratio</Label><Input type="number" step={0.05} value={newR} onChange={(e) => setNewR(Number(e.target.value))} /></div>
            <div><Label className="text-xs">Repeat ratio</Label><Input type="number" step={0.05} value={repR} onChange={(e) => setRepR(Number(e.target.value))} /></div>
          </div>
          <Button onClick={() => createMut.mutate()} disabled={createMut.isPending}>{createMut.isPending ? "Creating…" : "Create event"}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>All events</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Window</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">{formatDate(e.scheduled_date)}</td>
                  <td className="px-4 py-2 text-muted-foreground text-xs">{formatDate(e.opens_at)} → {formatDate(e.closes_at)}</td>
                  <td className="px-4 py-2 capitalize">{e.status}</td>
                  <td className="px-4 py-2 text-right">
                    {e.status !== "scored" && new Date(e.closes_at) < new Date() && (
                      <Button size="sm" onClick={() => scoreMut.mutate(e.id)} disabled={scoreMut.isPending}>Score now</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
