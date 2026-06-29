import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Trophy, Clock, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TNPSC101 — Crack Bank, SSC & Placement Aptitude Tests" },
      { name: "description", content: "Unlimited 25-question mock tests across 16 aptitude and reasoning topics. Compete weekly on the Saturday Main Test leaderboard." },
      { property: "og:title", content: "TNPSC101 — Aptitude & Reasoning Mock Tests" },
      { property: "og:description", content: "Unlimited 25-question practice tests + weekly ranked Main Test for competitive exam aspirants." },
      { property: "og:url", content: "https://tnpscctsaptitude.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://tnpscctsaptitude.lovable.app/" }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-bold">T</span>
            <span>TNPSC101</span>
          </Link>
          <nav className="flex items-center gap-2">
            <Link to="/leaderboard">
              <Button variant="ghost" size="sm">Leaderboard</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">Sign in</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="container mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-accent-foreground">
              <span className="rounded-full bg-accent px-3 py-1">For bank, SSC & placement aspirants</span>
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Practice every day. <br />
              Rank every Saturday.
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              Unlimited 25-question mock tests across 16 aptitude and reasoning topics — no question ever repeats until you've seen the whole bank.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth">
                <Button size="lg">Start practicing free</Button>
              </Link>
              <Link to="/leaderboard">
                <Button variant="outline" size="lg">See leaderboard</Button>
              </Link>
            </div>
          </div>

          <Card className="border-2 border-primary/10">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary"><BookOpen className="h-5 w-5" /></div>
                  <div>
                    <div className="font-semibold">15 Aptitude + 10 Reasoning</div>
                    <div className="text-sm text-muted-foreground">Every test follows the standard 25-question exam pattern</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary"><Trophy className="h-5 w-5" /></div>
                  <div>
                    <div className="font-semibold">Saturday Main Test</div>
                    <div className="text-sm text-muted-foreground">Weekly ranked test against every aspirant on the platform</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary"><Clock className="h-5 w-5" /></div>
                  <div>
                    <div className="font-semibold">Your timer, your pace</div>
                    <div className="text-sm text-muted-foreground">Set a custom limit or take it untimed — we track either way</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary"><BarChart3 className="h-5 w-5" /></div>
                  <div>
                    <div className="font-semibold">Topic-wise strengths</div>
                    <div className="text-sm text-muted-foreground">See which topics you're nailing and which need work</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} TNPSC101 — built for aspirants.
      </footer>
    </div>
  );
}
