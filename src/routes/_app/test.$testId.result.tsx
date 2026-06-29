import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getTestResults, reportQuestion } from "@/lib/tests.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, X, ArrowLeft, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/test/$testId/result")({
  head: () => ({
    meta: [
      { title: "Test Results — TNPSC101" },
      { name: "description", content: "Review your TNPSC101 mock test score, topic breakdown, and detailed answers." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Results,
});

function Results() {
  const { testId } = Route.useParams();
  const getFn = useServerFn(getTestResults);
  const { data, isLoading } = useQuery({
    queryKey: ["test-result", testId],
    queryFn: () => getFn({ data: { testId } }),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  if (!data) return <div>Result not available.</div>;

  const pct = Math.round((data.test.score / data.test.total_questions) * 100);

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Test Results</h1>
      <div className="flex items-center justify-between">
        <Link to="/dashboard"><Button variant="ghost" size="sm"><ArrowLeft className="mr-1 h-4 w-4" /> Back</Button></Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Score</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-baseline gap-4">
            <div className="font-mono text-5xl font-bold text-primary">{data.test.score}</div>
            <div className="text-lg text-muted-foreground">/ {data.test.total_questions} ({pct}%)</div>
            {data.test.total_time_seconds != null && (
              <div className="ml-auto text-sm text-muted-foreground">
                Time: {Math.floor(data.test.total_time_seconds / 60)}m {data.test.total_time_seconds % 60}s
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>By topic</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {data.topicBreakdown.map((t) => {
              const tpct = Math.round((t.correct / t.total) * 100);
              return (
                <li key={t.name}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{t.name}</span>
                    <span className="font-mono text-muted-foreground">{t.correct}/{t.total} ({tpct}%)</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded bg-secondary">
                    <div className="h-full bg-primary" style={{ width: `${tpct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Review</h2>
        <div className="space-y-3">
          {data.questions.map((q) => <QuestionReview key={q.position} q={q} />)}
        </div>
      </div>
    </div>
  );
}

function QuestionReview({ q }: { q: any }) {
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const reportFn = useServerFn(reportQuestion);
  const reportMut = useMutation({
    mutationFn: () => reportFn({ data: { questionId: q.questionId, reason } }),
    onSuccess: () => { toast.success("Reported. Thanks!"); setReportOpen(false); setReason(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="text-xs text-muted-foreground">
            Q{q.position} · {q.topicName} · {q.difficulty.replace("_", " ")}
          </div>
          <span className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            q.isCorrect ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {q.isCorrect ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {q.isCorrect ? "Correct" : q.selectedOption ? "Wrong" : "Skipped"}
          </span>
        </div>
        <div className="mt-3 whitespace-pre-wrap text-sm">{q.stem}</div>
        <div className="mt-3 space-y-1.5">
          {(["A", "B", "C", "D"] as const).map((opt) => {
            const isCorrect = q.correctOption === opt;
            const isSelected = q.selectedOption === opt;
            return (
              <div
                key={opt}
                className={cn(
                  "flex items-start gap-3 rounded-md border p-2.5 text-sm",
                  isCorrect && "border-success bg-success/5",
                  isSelected && !isCorrect && "border-destructive bg-destructive/5",
                  !isCorrect && !isSelected && "border-border",
                )}
              >
                <span className="font-mono text-xs font-semibold">{opt}.</span>
                <span className="flex-1">{q.options[opt]}</span>
                {isCorrect && <Check className="h-4 w-4 text-success" />}
                {isSelected && !isCorrect && <X className="h-4 w-4 text-destructive" />}
              </div>
            );
          })}
        </div>
        {q.explanation && (
          <div className="mt-3 rounded-md bg-secondary p-3 text-sm">
            <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Explanation</div>
            {q.explanation}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)}>
            <AlertTriangle className="mr-1 h-3 w-3" /> Report
          </Button>
        </div>
      </CardContent>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Report this question</DialogTitle></DialogHeader>
          <Textarea
            placeholder="What's wrong? (typo, wrong answer key, unclear wording…)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button onClick={() => reportMut.mutate()} disabled={reason.length < 3 || reportMut.isPending}>
              Submit report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
