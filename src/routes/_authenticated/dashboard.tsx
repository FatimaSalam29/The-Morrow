import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { editionsListQuery, profileQuery } from "@/lib/queries";
import { useInteractions } from "@/hooks/use-interactions";
import { computeAffinity, type Signal } from "@/lib/recommend";
import { topicLabel } from "@/lib/feeds";
import { formatEditionDate, localISODate } from "@/lib/dates";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your desk — The Morrow" },
      { name: "description", content: "Your reading stats, learned interests and recent editions." },
      { property: "og:title", content: "Your desk — The Morrow" },
      { property: "og:description", content: "Your reading stats, learned interests and recent editions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

function Dashboard() {
  const { data: profile } = useQuery(profileQuery());
  const editions = useQuery(editionsListQuery());
  const ix = useInteractions();
  const today = localISODate();
  const hasToday = editions.data?.some((e) => e.edition_date === today);

  const stats = useMemo(() => {
    const c = { read: 0, like: 0, save: 0, skip: 0 };
    for (const i of ix.all) c[i.action as keyof typeof c]++;
    return c;
  }, [ix.all]);

  const learned = useMemo(() => {
    const aff = computeAffinity(ix.all as unknown as Signal[]);
    return Object.entries(aff.categories).sort((a, b) => b[1] - a[1]);
  }, [ix.all]);
  const sources = useMemo(() => {
    const aff = computeAffinity(ix.all as unknown as Signal[]);
    return Object.entries(aff.sources).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [ix.all]);

  return (
    <div className="animate-press-in">
      <p className="kicker">{formatEditionDate(today)}</p>
      <h1 className="headline mt-2 text-4xl sm:text-5xl">
        {greeting()}{profile?.display_name ? `, ${profile.display_name}` : ""}.
      </h1>

      <section className="mt-8 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Link to="/today" className="group paper-sheet block p-6 sm:p-8">
          <p className="byline">Today's edition</p>
          <h2 className="masthead mt-3 text-4xl sm:text-6xl">The Morrow</h2>
          <div className="rule-double mt-3" />
          <p className="prose-news mt-4 text-lg text-ink-soft">
            {hasToday
              ? "Your paper is printed and waiting. Pick up where you left off."
              : "Fresh off the wires: we'll print today's paper the moment you open it."}
          </p>
          <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.14em] text-editorial">
            {hasToday ? "Open today's paper" : "Print today's paper"}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </Link>
        <div className="grid grid-cols-2 gap-px border border-rule bg-rule">
          {[
            ["Editions", editions.data?.length ?? 0],
            ["Stories read", stats.read],
            ["Liked", stats.like],
            ["Saved", stats.save],
          ].map(([label, n]) => (
            <div key={label} className="bg-card p-5">
              <p className="byline">{label}</p>
              <p className="headline mt-2 text-4xl">{ix.loading ? "–" : n}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-10 lg:grid-cols-2">
        <div>
          <div className="rule-thick" />
          <h2 className="headline py-2 text-2xl">What your paper has learned</h2>
          <div className="rule-thin" />
          {learned.length === 0 ? (
            <p className="prose-news mt-4 text-ink-soft">
              Nothing yet. Read, like, save or skip stories and your paper will start to lean toward
              what you actually care about.
            </p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {learned.map(([cat, v]) => (
                <li key={cat} className="grid grid-cols-[9rem_1fr_3rem] items-center gap-3 text-sm">
                  <span className="truncate font-semibold">{topicLabel(cat)}</span>
                  <div className="relative h-2 bg-paper-deep">
                    <div
                      className={v >= 0 ? "absolute inset-y-0 left-1/2 bg-ink" : "absolute inset-y-0 right-1/2 bg-editorial"}
                      style={{ width: `${Math.abs(v) * 50}%` }}
                    />
                    <div className="absolute inset-y-0 left-1/2 w-px bg-ink-soft" />
                  </div>
                  <span className="text-right tabular-nums text-muted-foreground">{v > 0 ? "+" : ""}{Math.round(v * 100)}</span>
                </li>
              ))}
            </ul>
          )}
          {sources.length > 0 && (
            <p className="mt-5 text-sm text-ink-soft">
              <span className="byline">Favourite newsrooms: </span>
              {sources.map(([s]) => s).join(" · ")}
            </p>
          )}
          <p className="mt-5 text-sm text-ink-soft">
            <span className="byline">Sections you follow: </span>
            {(profile?.topics ?? []).map(topicLabel).join(" · ")}
            {" "}
            <Link to="/settings" className="font-semibold text-editorial link-ink">Edit</Link>
          </p>
        </div>

        <div>
          <div className="rule-thick" />
          <div className="flex items-baseline justify-between py-2">
            <h2 className="headline text-2xl">Recent editions</h2>
            <Link to="/archive" className="byline link-ink">Full archive</Link>
          </div>
          <div className="rule-thin" />
          {editions.isLoading ? (
            <div className="mt-4 grid gap-3">
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : editions.data?.length ? (
            <ul className="divide-y divide-rule">
              {editions.data.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <Link to="/paper/$date" params={{ date: e.edition_date }} className="flex items-center justify-between py-3 hover:text-editorial">
                    <span className="font-serif text-lg">{formatEditionDate(e.edition_date)}</span>
                    <span className="byline">No. {e.edition_number} · {e.edition_articles?.[0]?.count ?? 0} stories</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <p className="prose-news text-ink-soft">Your first edition is one click away.</p>
              <Button asChild variant="editorial" className="mt-4"><Link to="/today">Print it now</Link></Button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
