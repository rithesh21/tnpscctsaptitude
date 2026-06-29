import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TNPSC101" },
      { name: "description", content: "Sign in or create your TNPSC101 account to start practicing aptitude and reasoning mock tests." },
      { property: "og:title", content: "Sign in — TNPSC101" },
      { property: "og:description", content: "Sign in or create your TNPSC101 account to start practicing aptitude and reasoning mock tests." },
      { property: "og:url", content: "https://tnpscctsaptitude.lovable.app/auth" },
    ],
    links: [{ rel: "canonical", href: "https://tnpscctsaptitude.lovable.app/auth" }],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [confirmEmail, setConfirmEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && session && !confirmEmail) navigate({ to: "/dashboard" });
  }, [loading, session, navigate, confirmEmail]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <h1 className="sr-only">Authentication</h1>
        <Link to="/" className="mb-6 flex items-center justify-center gap-2 font-semibold">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-bold">T</span>
          <span>TNPSC101</span>
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Welcome</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <SignInForm />
                <GoogleButton label="Sign in with Google" />
              </TabsContent>
              <TabsContent value="signup">
                <SignUpForm onNeedConfirm={(email) => setConfirmEmail(email)} />
                <GoogleButton label="Sign up with Google" />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!confirmEmail} onOpenChange={(o) => !o && setConfirmEmail(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Confirm your email</DialogTitle>
            <DialogDescription className="text-center">
              We've sent a confirmation link to <span className="font-medium text-foreground">{confirmEmail}</span>.
              Open it to verify your account, then sign in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button className="w-full" onClick={() => setConfirmEmail(null)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Divider() {
  return (
    <div className="my-4 flex items-center gap-3 text-xs uppercase text-muted-foreground">
      <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
    </div>
  );
}

function GoogleButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(result.error.message ?? "Google sign-in failed");
      }
      // redirected → browser navigates away; tokens → onAuthStateChange handles it
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }
  return (
    <>
      <Divider />
      <Button type="button" variant="outline" className="w-full" onClick={handle} disabled={loading}>
        <GoogleIcon /> {loading ? "Opening Google…" : label}
      </Button>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg className="mr-2 h-4 w-4" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.6 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.3 5.5l6.2 5.3C41 35 44 30 44 24c0-1.2-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    navigate({ to: "/dashboard" });
  }

  return (
    <form onSubmit={handle} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="si-email">Email</Label>
        <Input id="si-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="si-password">Password</Label>
        <Input id="si-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

function SignUpForm({ onNeedConfirm }: { onNeedConfirm: (email: string) => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);

    // If email confirmation is required, session is null
    if (!data.session) {
      onNeedConfirm(email);
      return;
    }
    toast.success("Account created — you're signed in.");
    navigate({ to: "/dashboard" });
  }

  return (
    <form onSubmit={handle} className="mt-4 space-y-4">
      <div className="space-y-2">
        <Label htmlFor="su-name">Name</Label>
        <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-email">Email</Label>
        <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="su-password">Password</Label>
        <Input id="su-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
    </form>
  );
}
