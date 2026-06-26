import { createFileRoute, Outlet, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_app/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAdmin) navigate({ to: "/dashboard" });
  }, [loading, isAdmin, navigate]);

  if (!isAdmin) return null;

  const tabs = [
    { to: "/admin", label: "Overview" },
    { to: "/admin/questions", label: "Questions" },
    { to: "/admin/questions/bulk", label: "Bulk upload" },
    { to: "/admin/pattern", label: "Pattern" },
    { to: "/admin/main-tests", label: "Main Tests" },
    { to: "/admin/analytics", label: "Analytics" },
    { to: "/admin/reports", label: "Reports" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="rounded-t-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            activeOptions={{ exact: true }}
            activeProps={{ className: "rounded-t-md px-3 py-2 text-sm text-foreground border-b-2 border-primary -mb-px font-medium" }}
          >
            {t.label}
          </Link>
        ))}
      </div>
      <Outlet />
    </div>
  );
}
