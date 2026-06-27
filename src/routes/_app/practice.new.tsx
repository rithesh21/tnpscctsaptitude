import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { startPracticeTest } from "@/lib/tests.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/practice/new")({
  head: () => ({ meta: [{ title: "New Practice Test — TNPSC101" }] }),
  component: NewPractice,
});

function NewPractice() {
  const navigate = useNavigate();
  const [timed, setTimed] = useState(false);
  const [minutes, setMinutes] = useState(30);
  const startFn = useServerFn(startPracticeTest);

  const mut = useMutation({
    mutationFn: () => startFn({ data: { timeLimitMinutes: timed ? minutes : null } }),
    onSuccess: (res) => navigate({ to: "/test/$testId", params: { testId: res.testId } }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>New Practice Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            25 questions: 15 Aptitude + 10 Reasoning, drawn fresh — no question you've already seen will repeat.
          </p>

          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label htmlFor="timed">Set a timer</Label>
              <p className="text-xs text-muted-foreground">If on, the test auto-submits when time runs out.</p>
            </div>
            <Switch id="timed" checked={timed} onCheckedChange={setTimed} />
          </div>

          {timed && (
            <div className="space-y-2">
              <Label htmlFor="min">Minutes</Label>
              <Input
                id="min"
                type="number"
                min={5}
                max={120}
                value={minutes}
                onChange={(e) => setMinutes(Math.max(5, Math.min(120, Number(e.target.value))))}
              />
            </div>
          )}

          <Button className="w-full" size="lg" disabled={mut.isPending} onClick={() => mut.mutate()}>
            {mut.isPending ? "Preparing test…" : "Start test"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
