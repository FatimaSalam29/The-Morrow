import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Download, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Masthead } from "@/components/paper/Masthead";
import { PressLoader } from "@/components/paper/PressLoader";
import { BriefStory, FrontStory, LeadStory, summaryOf } from "@/components/paper/Stories";
import { editionByDateQuery, profileQuery, type EditionStory } from "@/lib/queries";
import { generateEdition, fetchImagesForPdf } from "@/lib/news.functions";
import { formatEditionDate, localISODate, readingMinutes } from "@/lib/dates";
import { topicLabel } from "@/lib/feeds";
import { useInteractions } from "@/hooks/use-interactions";

export const Route = createFileRoute("/_authenticated/paper/$date")({
  head: ({ params }) => ({
    meta: [
      { title: `Your paper for ${params.date} — The Morrow` },
      { name: "description", content: "Your personalised daily edition." },
      { property: "og:title", content: "Your daily edition — The Morrow" },
      { property: "og:description", content: "Your personalised daily edition." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaperPage,
});

function shiftDate(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return localISODate(d);
}

function PaperPage() {
  const { date } = Route.useParams();
  const today = localISODate();
  const isToday = date === today;
  const qc = useQueryClient();
  const ix = useInteractions();
  const { data: profile } = useQuery(profileQuery());
  const edition = useQuery(editionByDateQuery(date));
  const generate = useServerFn(generateEdition);
  const getImages = useServerFn(fetchImagesForPdf);
  const [pdfBusy, setPdfBusy] = useState(false);
  const autoTried = useRef<string | null>(null);

  const build = useMutation({
    mutationFn: (rebuild: boolean) => generate({ data: { date, rebuild } }),
    onSuccess: async (_r, rebuild) => {
      await qc.invalidateQueries({ queryKey: ["edition", date] });
      qc.invalidateQueries({ queryKey: ["editions"] });
      if (rebuild) toast.success("A fresh edition is on the press.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "The presses jammed. Please try again."),
  });

  useEffect(() => {
    if (isToday && edition.isSuccess && edition.data === null && autoTried.current !== date && !build.isPending) {
      autoTried.current = date;
      build.mutate(false);
    }
  }, [isToday, edition.isSuccess, edition.data, date, build]);

  const stories = edition.data?.stories ?? [];
  const sections = useMemo(() => {
    const inside = stories.slice(4);
    const groups = new Map<string, EditionStory[]>();
    for (const s of inside) {
      const k = s.article.category;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(s);
    }
    return [...groups.entries()];
  }, [stories]);

  async function downloadPdf() {
    if (!edition.data) return;
    setPdfBusy(true);
    try {
      const urls = stories
        .slice(0, 8)
        .map((s) => s.article.image_url)
        .filter((u): u is string => !!u && /^https?:\/\//.test(u));
      let images = {};
      try {
        images = await getImages({ data: { urls } });
      } catch {
        images = {};
      }
      const { buildEditionPdf } = await import("@/lib/pdf");
      const blob = await buildEditionPdf({
        date,
        editionNumber: edition.data.edition.edition_number,
        readerName: profile?.display_name ?? null,
        note: edition.data.edition.headline_note,
        stories,
        images,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `the-morrow-${date}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create the PDF");
    } finally {
      setPdfBusy(false);
    }
  }

  if (edition.isLoading || build.isPending) {
    return <PressLoader title={build.isPending && build.variables ? "Reprinting" : "Printing your paper"} />;
  }
  if (edition.isError) {
    return (
      <EmptyState title="We couldn't fetch this edition" body={(edition.error as Error).message}>
        <Button onClick={() => edition.refetch()}>Try again</Button>
      </EmptyState>
    );
  }
  if (!edition.data) {
    return (
      <EmptyState
        title={isToday ? "Today's paper isn't printed yet" : "No paper was printed that day"}
        body={
          isToday
            ? build.isError
              ? (build.error as Error).message
              : "We'll gather this morning's stories for you."
            : `You didn't open the paper on ${formatEditionDate(date)}. Past editions are kept exactly as they were printed.`
        }
      >
        {isToday ? (
          <Button variant="editorial" onClick={() => build.mutate(false)}>
            Print today's paper
          </Button>
        ) : (
          <Button asChild variant="paper">
            <Link to="/archive">Browse the archive</Link>
          </Button>
        )}
      </EmptyState>
    );
  }

  const { edition: ed } = edition.data;
  const [lead, ...front] = stories.slice(0, 4);
  const minutes = readingMinutes(stories.map((s) => summaryOf(s.article)).join(" ")) + stories.length;
  const readCount = stories.filter((s) => ix.has(s.article.id, "read")).length;

  return (
    <div className="animate-press-in">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button asChild variant="quiet" size="sm">
            <Link to="/paper/$date" params={{ date: shiftDate(date, -1) }} aria-label="Previous day">
              <ChevronLeft /> Previous
            </Link>
          </Button>
          {!isToday && (
            <Button asChild variant="quiet" size="sm">
              <Link to="/paper/$date" params={{ date: shiftDate(date, 1) }} aria-label="Next day">
                Next <ChevronRight />
              </Link>
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isToday && (
            <Button variant="quiet" size="sm" onClick={() => build.mutate(true)} disabled={build.isPending}>
              <RefreshCw /> Reprint with latest news
            </Button>
          )}
          <Button variant="paper" size="sm" onClick={downloadPdf} disabled={pdfBusy}>
            <Download /> {pdfBusy ? "Typesetting PDF…" : "Download PDF"}
          </Button>
        </div>
      </div>

      <div className="paper-sheet px-4 py-6 sm:px-8 sm:py-8">
        <Masthead
          left={`Vol. I · No. ${ed.edition_number}`}
          right={profile?.display_name ? `Prepared for ${profile.display_name}` : "Your personal edition"}
          dateLine={`${formatEditionDate(date)} · ${stories.length} stories · about ${minutes} min · ${readCount}/${stories.length} read`}
        />

        {ed.headline_note && (
          <aside className="mx-auto mt-6 max-w-3xl text-center">
            <p className="kicker">From the editor</p>
            <p className="prose-news mt-2 text-lg italic text-ink-soft">{ed.headline_note}</p>
          </aside>
        )}

        {lead && (
          <section className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-0">
            <div className="lg:pr-8">
              <LeadStory a={lead.article} reason={lead.reason} ix={ix} />
            </div>
            <div className="grid content-start gap-6 border-rule lg:border-l lg:pl-8">
              {front.map((s, i) => (
                <div key={s.id} className={i > 0 ? "border-t border-rule pt-6" : ""}>
                  <FrontStory a={s.article} reason={s.reason} ix={ix} withImage={i === 0} />
                </div>
              ))}
            </div>
          </section>
        )}

        {sections.map(([cat, list]) => (
          <section key={cat} className="mt-12">
            <div className="rule-thick" />
            <div className="flex items-baseline justify-between py-2">
              <h2 className="headline text-2xl sm:text-3xl">{topicLabel(cat)}</h2>
              <span className="byline">{list.length} {list.length === 1 ? "story" : "stories"}</span>
            </div>
            <div className="rule-thin" />
            <div className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {list.map((s, i) =>
                i === 0 && list.length > 1 ? (
                  <div key={s.id} className="md:col-span-2 lg:col-span-1">
                    <FrontStory a={s.article} reason={s.reason} ix={ix} />
                  </div>
                ) : (
                  <BriefStory key={s.id} a={s.article} reason={s.reason} ix={ix} />
                ),
              )}
            </div>
          </section>
        ))}

        <footer className="mt-14 border-t-2 border-ink pt-4 text-center">
          <p className="byline">
            Reporting from {Array.from(new Set(stories.map((s) => s.article.source))).join(" · ")}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Summaries are written by AI from each publisher's own feed. Follow the links for the full,
            original reporting.
          </p>
        </footer>
      </div>
    </div>
  );
}

function EmptyState({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl py-24 text-center">
      <p className="kicker">Notice to readers</p>
      <h2 className="headline mt-3 text-4xl">{title}</h2>
      <p className="prose-news mt-4 text-ink-soft">{body}</p>
      <div className="mt-8 flex justify-center gap-3">{children}</div>
    </div>
  );
}
