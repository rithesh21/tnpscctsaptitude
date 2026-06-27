import { createFileRoute, Outlet, useNavigate, Link, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, BookOpen, History, Trophy, User, Shield, LogOut, Menu } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  const { session, loading, signOut, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  // Exam mode = full-bleed, no chrome
  const examMode = location.pathname.startsWith("/test/") && !location.pathname.endsWith("/result");

  if (examMode) {
    return <div className="min-h-screen bg-background"><Outlet /></div>;
  }

  const nav = [
    { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/practice/new", label: "Practice", Icon: BookOpen },
    { to: "/main-test", label: "Main Test", Icon: Trophy },
    { to: "/history", label: "History", Icon: History },
    { to: "/leaderboard", label: "Leaderboard", Icon: Trophy },
    { to: "/profile", label: "Profile", Icon: User },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
              <Menu className="h-5 w-5" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2 font-semibold">
              <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-bold">T</span>
              <span>TNPSC101</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground md:inline">{user?.email}</span>
            {isAdmin && (
              <Link to="/admin">
                <Button variant="outline" size="sm">
                  <Shield className="mr-1 h-4 w-4" /> Admin
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={async () => { await signOut(); navigate({ to: "/auth" }); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto flex max-w-6xl gap-6 px-4 py-6">
        <aside className={`${open ? "block" : "hidden"} md:block w-56 shrink-0`}>
          <nav className="space-y-1">
            {nav.map(({ to, label, Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                activeProps={{ className: "flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-primary text-primary-foreground" }}
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
