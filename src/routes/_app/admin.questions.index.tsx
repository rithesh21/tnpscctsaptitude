import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListQuestions, adminDeleteQuestion, adminBulkDeleteQuestions, adminUpsertQuestion, adminAiSeed } from "@/lib/admin.functions";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/admin/questions/")({
  head: () => ({ meta: [{ title: "Questions — Admin" }] }),
  component: AdminQuestions,
});

type Topic = { id: string; name: string; unit: string; slug: string };

function AdminQuestions() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListQuestions);
  const delFn = useServerFn(adminDeleteQuestion);
  const bulkDelFn = useServerFn(adminBulkDeleteQuestions);

  const [topics, setTopics] = useState<Topic[]>([]);
  const [topicId, setTopicId] = useState<string | undefined>();
  const [difficulty, setDifficulty] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<any | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.from("topics").select("id, name, unit, slug").order("sort_order").then(({ data }) => setTopics((data ?? []) as Topic[]));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-questions", topicId, difficulty, search, page],
    queryFn: () => listFn({ data: { topicId, difficulty: difficulty as any, search, page, pageSize: 25 } }),
  });

  // Clear selection when the visible page changes
  useEffect(() => { setSelected(new Set()); }, [topicId, difficulty, search, page]);

  const delMut = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-questions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkDelMut = useMutation({
    mutationFn: (ids: string[]) => bulkDelFn({ data: { ids } }),
    onSuccess: (r) => { toast.success(`Deleted ${r.deleted} questions`); setSelected(new Set()); qc.invalidateQueries({ queryKey: ["admin-questions"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const rows = (data?.rows ?? []) as any[];
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someChecked = rows.some((r) => selected.has(r.id));
  const toggleAll = () => {
    const next = new Set(selected);
    if (allChecked) rows.forEach((r) => next.delete(r.id));
    else rows.forEach((r) => next.add(r.id));
    setSelected(next);
  };
  const toggleOne = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">Search</Label>
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} placeholder="Search stem…" />
        </div>
        <div className="w-44">
          <Label className="text-xs">Topic</Label>
          <Select value={topicId ?? "all"} onValueChange={(v) => { setTopicId(v === "all" ? undefined : v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40">
          <Label className="text-xs">Difficulty</Label>
          <Select value={difficulty ?? "all"} onValueChange={(v) => { setDifficulty(v === "all" ? undefined : v); setPage(0); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
              <SelectItem value="very_hard">Very hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <AiSeedButton topics={topics} onSeeded={() => qc.invalidateQueries({ queryKey: ["admin-questions"] })} />
        <Button onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> New</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : (data?.rows ?? []).length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No questions found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Stem</th>
                  <th className="px-4 py-2">Topic</th>
                  <th className="px-4 py-2">Difficulty</th>
                  <th className="px-4 py-2">Answer</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {(data!.rows as any[]).map((q) => (
                  <tr key={q.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2 max-w-md truncate">{q.stem}</td>
                    <td className="px-4 py-2 text-muted-foreground">{q.topics.name}</td>
                    <td className="px-4 py-2 capitalize">{q.difficulty.replace("_", " ")}</td>
                    <td className="px-4 py-2 font-mono">{q.correct_option}</td>
                    <td className="px-4 py-2 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(q)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" onClick={() => { if (confirm("Delete question?")) delMut.mutate(q.id); }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{data?.total ?? 0} total</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Prev</Button>
          <Button variant="outline" size="sm" disabled={(page + 1) * 25 >= (data?.total ?? 0)} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      </div>

      <QuestionEditor
        open={creating || !!editing}
        onClose={() => { setCreating(false); setEditing(null); }}
        topics={topics}
        editing={editing}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-questions"] })}
      />
    </div>
  );
}

function QuestionEditor({ open, onClose, topics, editing, onSaved }: { open: boolean; onClose: () => void; topics: Topic[]; editing: any; onSaved: () => void }) {
  const upsertFn = useServerFn(adminUpsertQuestion);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (open) {
      setForm(editing ? {
        topic_id: editing.topic_id,
        difficulty: editing.difficulty,
        stem: editing.stem,
        option_a: editing.option_a ?? "",
        option_b: editing.option_b ?? "",
        option_c: editing.option_c ?? "",
        option_d: editing.option_d ?? "",
        correct_option: editing.correct_option,
        explanation: editing.explanation ?? "",
        is_active: editing.is_active ?? true,
      } : {
        topic_id: topics[0]?.id,
        difficulty: "medium",
        stem: "",
        option_a: "", option_b: "", option_c: "", option_d: "",
        correct_option: "A",
        explanation: "",
        is_active: true,
      });
    }
  }, [open, editing, topics]);

  const mut = useMutation({
    mutationFn: () => upsertFn({ data: { id: editing?.id, data: form } }),
    onSuccess: () => { toast.success("Saved"); onSaved(); onClose(); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{editing ? "Edit question" : "New question"}</DialogTitle></DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Topic</Label>
              <Select value={form.topic_id} onValueChange={(v) => setForm({ ...form, topic_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={(v) => setForm({ ...form, difficulty: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="very_hard">Very hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Question stem</Label>
            <Textarea rows={4} value={form.stem ?? ""} onChange={(e) => setForm({ ...form, stem: e.target.value })} />
          </div>
          {(["a","b","c","d"] as const).map((k) => (
            <div key={k}>
              <Label>Option {k.toUpperCase()}</Label>
              <Input value={form[`option_${k}`] ?? ""} onChange={(e) => setForm({ ...form, [`option_${k}`]: e.target.value })} />
            </div>
          ))}
          <div>
            <Label>Correct option</Label>
            <Select value={form.correct_option} onValueChange={(v) => setForm({ ...form, correct_option: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["A","B","C","D"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Explanation</Label>
            <Textarea rows={3} value={form.explanation ?? ""} onChange={(e) => setForm({ ...form, explanation: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AiSeedButton({ topics, onSeeded }: { topics: Topic[]; onSeeded: () => void }) {
  const seedFn = useServerFn(adminAiSeed);
  const [open, setOpen] = useState(false);
  const [topicId, setTopicId] = useState<string>("");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);

  useEffect(() => { if (!topicId && topics[0]) setTopicId(topics[0].id); }, [topics, topicId]);

  const mut = useMutation({
    mutationFn: () => seedFn({ data: { topicId, difficulty: difficulty as any, count } }),
    onSuccess: (r) => { toast.success(`AI generated ${r.inserted} questions`); onSeeded(); setOpen(false); },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><Sparkles className="mr-1 h-4 w-4" /> AI seed</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Generate questions with AI</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Topic</Label>
              <Select value={topicId} onValueChange={setTopicId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{topics.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                  <SelectItem value="very_hard">Very hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Count (1–10)</Label>
              <Input type="number" min={1} max={10} value={count} onChange={(e) => setCount(Math.max(1, Math.min(10, Number(e.target.value))))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Generating…" : "Generate"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
