import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/today", label: "Today's Paper" },
  { to: "/dashboard", label: "Desk" },
  { to: "/explore", label: "Explore" },
  { to: "/saved", label: "Saved" },
  { to: "/archive", label: "Archive" },
  { to: "/settings", label: "Preferences" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <nav className="sticky top-0 z-40 border-b border-ink/80 bg-paper/95 backdrop-blur supports-[backdrop-filter]:bg-paper/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link to="/today" className="masthead text-2xl text-ink">
            The Morrow
          </Link>
          <div className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="px-3 py-1.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-ink-soft transition-colors hover:text-ink"
                activeProps={{ className: "text-editorial! underline underline-offset-8 decoration-2" }}
              >
                {n.label}
              </Link>
            ))}
            <Button variant="quiet" size="sm" onClick={signOut} className="ml-2 uppercase tracking-[0.14em] text-[0.72rem]">
              Sign out
            </Button>
          </div>
          <button
            className="md:hidden p-2 text-ink"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        <div className={cn("border-t border-rule md:hidden", open ? "block" : "hidden")}>
          <div className="mx-auto flex max-w-7xl flex-col px-4 py-2">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="py-2.5 text-sm font-semibold uppercase tracking-[0.14em] text-ink-soft"
                activeProps={{ className: "text-editorial!" }}
              >
                {n.label}
              </Link>
            ))}
            <button onClick={signOut} className="py-2.5 text-left text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Sign out
            </button>
          </div>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">{children}</main>
    </div>
  );
}
