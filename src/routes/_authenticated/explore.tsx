import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BriefStory } from "@/components/paper/Stories";
import { TOPICS, ALL_SOURCES } from "@/lib/feeds";
import { refreshWire } from "@/lib/news.functions";
import { useInteractions } from "@/hooks/use-interactions";
import { cn } from "@/lib/utils";
import type { Article } from "@/lib/queries";

const search = z.object({
  q: z.string().optional(),
  section: z.string().optional(),
  source: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/explore")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Explore the wire — The Morrow" },
      { name: "description", content: "Search every story on the wire by keyword, section and newsroom." },
      { property: "og:title", content: "Explore the wire — The Morrow" },
      { property: "og:description", content: "Search every story on the wire by keyword, section and newsroom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Explore,
});

function Explore() {
  const { q = "", section, source } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [draft, setDraft] = useState(q);
  const qc = useQueryClient();
  const ix = useInteractions();
  const refresh = useServerFn(refreshWire);

  useEffect(() => setDraft(q), [q]);

  const results = useQuery({
    queryKey: ["explore", q, section ?? null, source ?? null],
    queryFn: async () => {
      let query = supabase
        .from("articles")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false })
        .limit(60);
      if (section) query = query.eq("category", section);
      if (source) query = query.eq("source", source);
      const term = q.trim().replace(/[%,()]/g, " ");
      if (term) query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,ai_summary.ilike.%${term}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as Article[];
    },
  });

  const wire = useMutation({
    mutationFn: () => refresh(),
    onSuccess: (r) => {
      toast.success(`Wire refreshed — ${r.fetched} stories from ${r.feedsOk} of ${r.feedsTotal} sources.`);
      qc.invalidateQueries({ queryKey: ["explore"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not refresh the wire"),
  });

  useEffect(() => {
    // Pull the full wire once per session so Explore covers every section.
    if (sessionStorage.getItem("wire-refreshed")) return;
    sessionStorage.setItem("wire-refreshed", "1");
    wire.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (patch: Partial<z.infer<typeof search>>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  return (
    <div className="animate-press-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">The wire room</p>
          <h1 className="headline mt-2 text-4xl sm:text-5xl">Explore</h1>
        </div>
        <Button variant="quiet" size="sm" onClick={() => wire.mutate()} disabled={wire.isPending}>
          <RefreshCw className={cn(wire.isPending && "animate-spin")} /> {wire.isPending ? "Refreshing the wire…" : "Refresh the wire"}
        </Button>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          set({ q: draft.trim() || undefined });
        }}
        className="mt-6 flex items-center gap-3 border-b-2 border-ink pb-2"
      >
        <Search className="size-5 text-ink-soft" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Search headlines, people, places…"
          aria-label="Search stories"
          className="h-11 flex-1 bg-transparent font-serif text-xl outline-none placeholder:text-muted-foreground/70"
        />
        <Button type="submit" size="sm">Search</Button>
      </form>

      <div className="mt-5 flex flex-wrap gap-2">
        <Chip on={!section} onClick={() => set({ section: undefined })}>All sections</Chip>
        {TOPICS.map((t) => (
          <Chip key={t.id} on={section === t.id} onClick={() => set({ section: section === t.id ? undefined : t.id })}>
            {t.label}
          </Chip>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="byline mr-1">Newsroom</span>
        <select
          value={source ?? ""}
          onChange={(e) => set({ source: e.target.value || undefined })}
          className="h-9 border border-rule bg-card px-2 text-sm"
          aria-label="Filter by newsroom"
        >
          <option value="">Any</option>
          {ALL_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {(q || section || source) && (
          <button className="ml-2 text-sm font-semibold text-editorial link-ink" onClick={() => navigate({ search: {}, replace: true })}>
            Clear filters
          </button>
        )}
      </div>

      <div className="rule-thin mt-6" />
      {results.isLoading ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : results.isError ? (
        <p className="mt-6 text-destructive">Search failed. Please try again.</p>
      ) : results.data?.length === 0 ? (
        <div className="py-16 text-center">
          <p className="headline text-2xl">Nothing on the wire matches.</p>
          <p className="mt-2 text-muted-foreground">Try a broader search, or refresh the wire.</p>
        </div>
      ) : (
        <>
          <p className="byline mt-4">{results.data?.length} stories</p>
          <div className="mt-4 grid gap-x-10 gap-y-8 md:grid-cols-2">
            {results.data?.map((a) => (
              <div key={a.id} className="border-b border-rule pb-6">
                <BriefStory a={a} ix={ix} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "border px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] transition-colors",
        on ? "border-ink bg-ink text-paper" : "border-rule text-ink-soft hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
