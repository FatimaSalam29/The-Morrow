import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { editionsListQuery } from "@/lib/queries";
import { formatEditionDate } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/archive")({
  head: () => ({
    meta: [
      { title: "The archive — The Morrow" },
      { name: "description", content: "Every edition of your personal paper, kept as it was printed." },
      { property: "og:title", content: "The archive — The Morrow" },
      { property: "og:description", content: "Every edition of your personal paper, kept as it was printed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Archive,
});

function Archive() {
  const q = useQuery(editionsListQuery());
  const byMonth = useMemo(() => {
    const m = new Map<string, NonNullable<typeof q.data>>();
    for (const e of q.data ?? []) {
      const key = new Date(`${e.edition_date}T12:00:00`).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    }
    return [...m.entries()];
  }, [q.data]);

  return (
    <div className="animate-press-in">
      <p className="kicker">Bound volumes</p>
      <h1 className="headline mt-2 text-4xl sm:text-5xl">The archive</h1>
      <p className="prose-news mt-3 max-w-2xl text-ink-soft">
        Every paper we've printed for you, preserved exactly as it ran that morning.
      </p>

      {q.isLoading && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-44" />)}
        </div>
      )}
      {q.isError && <p className="mt-8 text-destructive">Could not load the archive. Please refresh.</p>}
      {q.data?.length === 0 && (
        <div className="mt-10">
          <p className="prose-news text-ink-soft">No editions yet.</p>
          <Button asChild variant="editorial" className="mt-4"><Link to="/today">Print today's paper</Link></Button>
        </div>
      )}

      {byMonth.map(([month, list]) => (
        <section key={month} className="mt-10">
          <div className="rule-thick" />
          <h2 className="headline py-2 text-2xl">{month}</h2>
          <div className="rule-thin" />
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {list.map((e) => (
              <Link
                key={e.id}
                to="/paper/$date"
                params={{ date: e.edition_date }}
                className="group paper-sheet block p-5 transition-transform hover:-translate-y-1"
              >
                <p className="byline flex justify-between"><span>No. {e.edition_number}</span><span>{e.edition_articles?.[0]?.count ?? 0} stories</span></p>
                <div className="rule-thin mt-2" />
                <p className="masthead mt-3 text-center text-2xl">The Morrow</p>
                <div className="rule-double mt-2" />
                <p className="mt-3 text-center font-serif">{formatEditionDate(e.edition_date)}</p>
                {e.headline_note && <p className="prose-news mt-3 line-clamp-3 text-sm italic text-ink-soft">{e.headline_note}</p>}
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
