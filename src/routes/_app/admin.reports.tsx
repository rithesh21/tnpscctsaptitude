import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { adminListReports, adminResolveReport } from "@/lib/admin.functions";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/admin/reports")({
  head: () => ({ meta: [{ title: "Reports — Admin" }] }),
  component: Reports,
});

function Reports() {
  const qc = useQueryClient();
  const listFn = useServerFn(adminListReports);
  const resFn = useServerFn(adminResolveReport);
  const { data, isLoading } = useQuery({ queryKey: ["admin-reports"], queryFn: () => listFn() });
  const mut = useMutation({
    mutationFn: (v: { id: string; status: "resolved" | "dismissed" }) => resFn({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["admin-reports"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading…</div>;
  const rows = (data ?? []) as any[];

  return (
    <Card>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">No reports.</p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-xs text-muted-foreground">
                      {formatDate(r.created_at)} · {r.questions?.topics?.name} · status: <span className="capitalize">{r.status}</span>
                    </div>
                    <div className="mt-1 text-sm truncate">{r.questions?.stem}</div>
                    <div className="mt-2 rounded bg-secondary p-2 text-sm">{r.reason}</div>
                  </div>
                  {r.status === "open" && (
                    <div className="flex flex-col gap-1">
                      <Button size="sm" onClick={() => mut.mutate({ id: r.id, status: "resolved" })}>Resolve</Button>
                      <Button size="sm" variant="outline" onClick={() => mut.mutate({ id: r.id, status: "dismissed" })}>Dismiss</Button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
