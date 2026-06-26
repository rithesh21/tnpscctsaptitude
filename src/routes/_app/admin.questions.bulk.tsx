import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminBulkUploadQuestions } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

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

function BulkUpload() {
  const fn = useServerFn(adminBulkUploadQuestions);
  const [preview, setPreview] = useState<{ rows: any[]; count: number } | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const mut = useMutation({
    mutationFn: () => fn({ data: { rows: preview!.rows } }),
    onSuccess: (res) => {
      toast.success(`Inserted ${res.inserted} questions${res.errors.length ? ` · ${res.errors.length} errors` : ""}`);
      if (res.errors.length) console.warn("Bulk errors", res.errors);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
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
  );
}
