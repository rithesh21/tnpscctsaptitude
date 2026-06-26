import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { adminGetPattern, adminUpdatePattern } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/pattern")({
  head: () => ({ meta: [{ title: "Pattern — Admin" }] }),
  component: PatternPage,
});

function PatternPage() {
  const qc = useQueryClient();
  const getFn = useServerFn(adminGetPattern);
  const updFn = useServerFn(adminUpdatePattern);
  const { data } = useQuery({ queryKey: ["pattern"], queryFn: () => getFn() });
  const [form, setForm] = useState<any>(null);

  useEffect(() => { if (data) setForm(data); }, [data]);

  const mut = useMutation({
    mutationFn: () => updFn({ data: form }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["pattern"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!form) return <div className="text-muted-foreground">Loading…</div>;

  const pctSum = form.pct_easy + form.pct_medium + form.pct_hard + form.pct_very_hard;
  const ratioSum = form.main_test_new_ratio + form.main_test_repeat_ratio;

  return (
    <Card className="max-w-2xl">
      <CardHeader><CardTitle>Test pattern</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Aptitude questions" value={form.unit1_count} onChange={(v) => setForm({ ...form, unit1_count: v })} />
          <Field label="Reasoning questions" value={form.unit2_count} onChange={(v) => setForm({ ...form, unit2_count: v })} />
        </div>

        <div>
          <div className="mb-1 text-sm font-medium">Difficulty mix (must sum to 100)</div>
          <div className="grid grid-cols-4 gap-2">
            <Field label="Easy %" value={form.pct_easy} onChange={(v) => setForm({ ...form, pct_easy: v })} />
            <Field label="Medium %" value={form.pct_medium} onChange={(v) => setForm({ ...form, pct_medium: v })} />
            <Field label="Hard %" value={form.pct_hard} onChange={(v) => setForm({ ...form, pct_hard: v })} />
            <Field label="Very hard %" value={form.pct_very_hard} onChange={(v) => setForm({ ...form, pct_very_hard: v })} />
          </div>
          <p className={`mt-1 text-xs ${pctSum === 100 ? "text-muted-foreground" : "text-destructive"}`}>Sum: {pctSum}</p>
        </div>

        <Field label="Daily practice cap (per user)" value={form.daily_practice_cap} onChange={(v) => setForm({ ...form, daily_practice_cap: v })} />

        <div>
          <div className="mb-1 text-sm font-medium">Main Test composition (ratios must sum to 1.0)</div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="New ratio" value={form.main_test_new_ratio} step={0.05} onChange={(v) => setForm({ ...form, main_test_new_ratio: v })} />
            <Field label="Repeat ratio" value={form.main_test_repeat_ratio} step={0.05} onChange={(v) => setForm({ ...form, main_test_repeat_ratio: v })} />
          </div>
          <p className={`mt-1 text-xs ${Math.abs(ratioSum - 1) < 0.001 ? "text-muted-foreground" : "text-destructive"}`}>Sum: {ratioSum.toFixed(2)}</p>
        </div>

        <Field label="Main Test duration (minutes)" value={form.main_test_duration_minutes} onChange={(v) => setForm({ ...form, main_test_duration_minutes: v })} />

        <Button onClick={() => mut.mutate()} disabled={mut.isPending || pctSum !== 100 || Math.abs(ratioSum - 1) > 0.001}>
          {mut.isPending ? "Saving…" : "Save pattern"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
