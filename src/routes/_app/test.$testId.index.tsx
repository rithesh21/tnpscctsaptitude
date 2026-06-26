import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTestForTaking, submitTest } from "@/lib/tests.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { toast } from "sonner";
import { Flag, Clock, X } from "lucide-react";

export const Route = createFileRoute("/_app/test/$testId/index")({
  head: () => ({ meta: [{ title: "Mock Test — Korangu" }] }),
  component: TestTaker,
});

type OptKey = "A" | "B" | "C" | "D";

function TestTaker() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();
  const getFn = useServerFn(getTestForTaking);
  const submitFn = useServerFn(submitTest);

  const { data, isLoading } = useQuery({
    queryKey: ["test", testId],
    queryFn: () => getFn({ data: { testId } }),
    refetchOnWindowFocus: false,
  });

  const questions = data?.questions ?? [];
  const test = data?.test;

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, OptKey | null>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [elapsed, setElapsed] = useState(0);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const startTime = useRef<number>(Date.now());
  const lastQTime = useRef<number>(Date.now());
  const timeSpent = useRef<Record<number, number>>({});

  // Already-answered init
  useEffect(() => {
    if (data) {
      const init: Record<number, OptKey | null> = {};
      questions.forEach((q) => {
        init[q.position] = (q.selectedOption as OptKey | null) ?? null;
      });
      setAnswers(init);
      if (test?.started_at) startTime.current = new Date(test.started_at).getTime();
      lastQTime.current = Date.now();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // Tick
  useEffect(() => {
    const i = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime.current) / 1000));
    }, 1000);
    return () => clearInterval(i);
  }, []);

  const limit = test?.time_limit_seconds ?? null;
  const remaining = limit != null ? Math.max(0, limit - elapsed) : null;

  const submitMut = useMutation({
    mutationFn: () =>
      submitFn({
        data: {
          testId,
          answers: Object.fromEntries(Object.entries(answers).map(([k, v]) => [k, v])) as any,
          timeSpent: timeSpent.current as any,
          totalTimeSeconds: elapsed,
        },
      }),
    onSuccess: () => navigate({ to: "/test/$testId/result", params: { testId } }),
    onError: (e: Error) => toast.error(e.message),
  });

  // Auto submit
  useEffect(() => {
    if (remaining === 0 && limit != null && !submitMut.isPending) {
      toast.info("Time's up — submitting your test.");
      submitMut.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, limit]);

  function recordTime(pos: number) {
    const now = Date.now();
    const delta = Math.floor((now - lastQTime.current) / 1000);
    timeSpent.current[pos] = (timeSpent.current[pos] ?? 0) + delta;
    lastQTime.current = now;
  }

  function goTo(idx: number) {
    if (questions[current]) recordTime(questions[current].position);
    setCurrent(idx);
    setPaletteOpen(false);
  }

  function setAnswer(pos: number, opt: OptKey) {
    setAnswers((a) => ({ ...a, [pos]: a[pos] === opt ? null : opt }));
  }

  function toggleMark(pos: number) {
    setMarked((m) => ({ ...m, [pos]: !m[pos] }));
  }

  function statusOf(pos: number): "current" | "answered" | "marked" | "unanswered" {
    if (questions[current]?.position === pos) return "current";
    if (marked[pos]) return "marked";
    if (answers[pos]) return "answered";
    return "unanswered";
  }

  const answeredCount = useMemo(
    () => Object.values(answers).filter(Boolean).length,
    [answers],
  );

  if (isLoading || !test) {
    return <div className="grid min-h-screen place-items-center text-muted-foreground">Loading test…</div>;
  }

  const q = questions[current];
  if (!q) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/dashboard" })}>
              <X className="h-4 w-4" />
            </Button>
            <div className="hidden text-sm text-muted-foreground sm:block">
              {test.test_type === "main" ? "Main Test" : "Practice"}
            </div>
          </div>
          <div className="flex items-center gap-2 font-mono text-base">
            <Clock className="h-4 w-4" />
            {remaining != null ? (
              <span className={cn(remaining < 60 && "text-destructive")}>{formatTime(remaining)}</span>
            ) : (
              <span>{formatTime(elapsed)}</span>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => {
              recordTime(q.position);
              submitMut.mutate();
            }}
            disabled={submitMut.isPending}
          >
            Submit
          </Button>
        </div>
      </header>

      <div className="container mx-auto grid max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[1fr_280px]">
        {/* Question */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Q{q.position} of {questions.length}</span>
              <span>{q.topicName} · {q.topicUnit === "I" ? "Aptitude" : "Reasoning"} · {q.difficulty.replace("_", " ")}</span>
            </div>
            <div className="mt-4 whitespace-pre-wrap text-base leading-relaxed">{q.stem}</div>
            <div className="mt-6 space-y-2">
              {(["A", "B", "C", "D"] as const).map((opt) => {
                const selected = answers[q.position] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => setAnswer(q.position, opt)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors",
                      selected ? "border-primary bg-primary/5" : "border-border hover:bg-secondary",
                    )}
                  >
                    <span className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-full border text-sm font-medium",
                      selected ? "border-primary bg-primary text-primary-foreground" : "border-border",
                    )}>{opt}</span>
                    <span className="pt-0.5">{q.options[opt]}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={() => toggleMark(q.position)}>
                <Flag className={cn("mr-1 h-4 w-4", marked[q.position] && "fill-accent text-accent")} />
                {marked[q.position] ? "Marked" : "Mark for review"}
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={current === 0} onClick={() => goTo(current - 1)}>
                  Previous
                </Button>
                <Button size="sm" disabled={current >= questions.length - 1} onClick={() => goTo(current + 1)}>
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Palette */}
        <aside className="space-y-3">
          <Button variant="outline" className="w-full lg:hidden" onClick={() => setPaletteOpen(!paletteOpen)}>
            {paletteOpen ? "Hide" : "Show"} palette ({answeredCount}/{questions.length})
          </Button>
          <div className={cn("space-y-3", !paletteOpen && "hidden lg:block")}>
            <Card>
              <CardContent className="p-4">
                <div className="mb-2 text-xs text-muted-foreground">
                  Answered: {answeredCount} / {questions.length}
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {questions.map((qq, i) => {
                    const s = statusOf(qq.position);
                    return (
                      <button
                        key={qq.position}
                        onClick={() => goTo(i)}
                        className={cn(
                          "grid aspect-square place-items-center rounded text-xs font-medium transition-colors",
                          s === "current" && "bg-primary text-primary-foreground ring-2 ring-primary",
                          s === "answered" && "bg-success/15 text-success-foreground border border-success/40",
                          s === "marked" && "bg-accent/30 text-accent-foreground border border-accent",
                          s === "unanswered" && "bg-secondary text-secondary-foreground",
                        )}
                      >
                        {qq.position}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-success/15 border border-success/40" /> Answered</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-accent/30 border border-accent" /> Marked</div>
                  <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-secondary" /> Not seen</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>
    </div>
  );
}
