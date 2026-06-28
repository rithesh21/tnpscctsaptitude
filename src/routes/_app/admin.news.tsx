import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listNewsUpdates, adminCreateNewsUpdate, adminDeleteNewsUpdate } from "@/lib/news.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/admin/news")({
  head: () => ({ meta: [{ title: "News — Admin — TNPSC101" }] }),
  component: AdminNews,
});

function AdminNews() {
  const qc = useQueryClient();
  const listFn = useServerFn(listNewsUpdates);
  const createFn = useServerFn(adminCreateNewsUpdate);
  const deleteFn = useServerFn(adminDeleteNewsUpdate);

  const { data: news = [] } = useQuery({ queryKey: ["news"], queryFn: () => listFn() });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const create = useMutation({
    mutationFn: () => createFn({ data: { title: title.trim(), body: body.trim() } }),
    onSuccess: () => {
      setTitle(""); setBody("");
      qc.invalidateQueries({ queryKey: ["news"] });
      toast.success("News posted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["news"] });
      toast.success("Deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Post a news update</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder="e.g., Main Test moves to 11:00 AM this Saturday" />
          </div>
          <div>
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={4} placeholder="Share the announcement details…" />
          </div>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || title.trim().length < 2 || body.trim().length < 2}
          >
            {create.isPending ? "Posting…" : "Post update"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Published updates</CardTitle></CardHeader>
        <CardContent>
          {news.length === 0 ? (
            <p className="text-sm text-muted-foreground">No updates yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {news.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <div className="font-medium">{n.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(n.created_at)}</div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => del.mutate(n.id)}
                    disabled={del.isPending}
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
