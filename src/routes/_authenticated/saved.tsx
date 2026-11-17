import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BriefStory } from "@/components/paper/Stories";
import { savedQuery } from "@/lib/queries";
import { useInteractions } from "@/hooks/use-interactions";

export const Route = createFileRoute("/_authenticated/saved")({
  head: () => ({
    meta: [
      { title: "Saved clippings — The Morrow" },
      { name: "description", content: "Stories you've clipped to read again." },
      { property: "og:title", content: "Saved clippings — The Morrow" },
      { property: "og:description", content: "Stories you've clipped to read again." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Saved,
});

function Saved() {
  const q = useQuery(savedQuery());
  const ix = useInteractions();
  return (
    <div className="animate-press-in">
      <p className="kicker">Your clippings</p>
      <h1 className="headline mt-2 text-4xl sm:text-5xl">Saved stories</h1>
      <div className="rule-thin mt-6" />
      {q.isLoading ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : q.data?.length ? (
        <div className="mt-6 grid gap-x-10 gap-y-8 md:grid-cols-2">
          {q.data.filter((r) => r.article).map((r) => (
            <div key={r.article.id} className="border-b border-rule pb-6">
              <BriefStory a={r.article} ix={ix} />
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="headline text-2xl">No clippings yet.</p>
          <p className="mt-2 text-muted-foreground">Tap “Save” on any story to keep it here.</p>
          <Button asChild variant="paper" className="mt-6"><Link to="/today">Open today's paper</Link></Button>
        </div>
      )}
    </div>
  );
}
