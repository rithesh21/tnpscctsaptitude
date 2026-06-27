import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminBulkUploadQuestions } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/admin/questions/bulk")({
  head: () => ({ meta: [{ title: "Bulk upload — Admin" }] }),
  component: BulkUpload,
});

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQuote = false;
      else cell += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === ",") { cur.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        cur.push(cell); cell = "";
        if (cur.some((x) => x.length > 0)) lines.push(cur);
        cur = [];
      } else cell += c;
    }
  }
  if (cell.length > 0 || cur.length > 0) { cur.push(cell); if (cur.some((x) => x.length > 0)) lines.push(cur); }
  const [headers, ...rows] = lines;
  return { headers: headers ?? [], rows };
}

type Result = {
  inserted: number;
  errors: { row: number; reason: string }[];
  removedDuplicates: { row: number; stem: string; reason: string }[];
};

function BulkUpload() {
  const fn = useServerFn(adminBulkUploadQuestions);
  const [preview, setPreview] = useState<{ rows: any[]; count: number } | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<Result | null>(null);

  const mut = useMutation({
    mutationFn: () => fn({ data: { rows: preview!.rows } }),
    onSuccess: (res: Result) => {
      setResult(res);
      const dupes = res.removedDuplicates.length;
      toast.success(
        `Inserted ${res.inserted}${dupes ? ` · removed ${dupes} duplicate${dupes === 1 ? "" : "s"}` : ""}${res.errors.length ? ` · ${res.errors.length} errors` : ""}`,
      );
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    const text = await file.text();
    const { headers, rows } = parseCsv(text);
    const required = ["topic_slug", "difficulty", "stem", "option_a", "option_b", "option_c", "option_d", "correct_option"];
    const missing = required.filter((k) => !headers.includes(k));
    if (missing.length) { toast.error(`Missing columns: ${missing.join(", ")}`); return; }
    const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
    const objs = rows.map((r) => ({
      topic_slug: r[idx.topic_slug] ?? "",
      difficulty: r[idx.difficulty] ?? "",
      stem: r[idx.stem] ?? "",
      option_a: r[idx.option_a] ?? "",
      option_b: r[idx.option_b] ?? "",
      option_c: r[idx.option_c] ?? "",
      option_d: r[idx.option_d] ?? "",
      correct_option: r[idx.correct_option] ?? "",
      explanation: idx.explanation != null ? r[idx.explanation] ?? null : null,
    }));
    setPreview({ rows: objs, count: objs.length });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>Bulk upload questions (CSV)</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-secondary p-3 text-sm">
            <div className="font-medium">CSV columns (header row required):</div>
            <code className="text-xs">topic_slug, difficulty, stem, option_a, option_b, option_c, option_d, correct_option, explanation</code>
            <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
              <li><code>topic_slug</code>: slug like <code>simplification</code>, <code>percentage</code>, <code>logical-reasoning</code>, etc.</li>
              <li><code>difficulty</code>: easy | medium | hard | very_hard</li>
              <li><code>correct_option</code>: A | B | C | D</li>
              <li className="font-medium text-foreground">Duplicates are auto-detected and removed before insert — both within the CSV and against existing questions.</li>
            </ul>
          </div>
          <Input type="file" accept=".csv" onChange={onFile} />
          {preview && (
            <div className="text-sm">
              <p>{fileName} — <span className="font-mono">{preview.count}</span> rows parsed.</p>
              <Button className="mt-3" onClick={() => mut.mutate()} disabled={mut.isPending || preview.count === 0}>
                {mut.isPending ? "Uploading…" : `Upload ${preview.count} questions`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Upload result
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-3">
              <Stat label="Inserted" value={result.inserted} tone="ok" />
              <Stat label="Duplicates removed" value={result.removedDuplicates.length} tone="warn" />
              <Stat label="Errors" value={result.errors.length} tone={result.errors.length ? "err" : "muted"} />
            </div>

            {result.removedDuplicates.length > 0 && (
              <div>
                <div className="mb-2 font-medium">Removed duplicate questions</div>
                <div className="max-h-80 overflow-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary text-left text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 w-16">Row</th>
                        <th className="px-3 py-2">Question (stem)</th>
                        <th className="px-3 py-2 w-64">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.removedDuplicates.map((d, i) => (
                        <tr key={i} className="border-t border-border align-top">
                          <td className="px-3 py-2 font-mono">{d.row}</td>
                          <td className="px-3 py-2">{d.stem}</td>
                          <td className="px-3 py-2 text-muted-foreground">{d.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4 text-destructive" /> Errors</div>
                <div className="max-h-60 overflow-auto rounded-md border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-secondary text-left text-muted-foreground">
                      <tr><th className="px-3 py-2 w-16">Row</th><th className="px-3 py-2">Reason</th></tr>
                    </thead>
                    <tbody>
                      {result.errors.map((e, i) => (
                        <tr key={i} className="border-t border-border"><td className="px-3 py-2 font-mono">{e.row}</td><td className="px-3 py-2">{e.reason}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "ok" | "warn" | "err" | "muted" }) {
  const cls =
    tone === "ok" ? "text-primary" : tone === "warn" ? "text-amber-600" : tone === "err" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="rounded-md border border-border p-3">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}
