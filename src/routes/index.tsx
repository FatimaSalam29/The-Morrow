import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Download, Newspaper, Sparkles, Target, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Masthead } from "@/components/paper/Masthead";
import { ALL_SOURCES, TOPICS } from "@/lib/feeds";
import heroImg from "@/assets/morning-table.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Morrow — a personal morning newspaper, printed for one" },
      {
        name: "description",
        content:
          "The Morrow gathers real reporting from trusted newsrooms, summarises it faithfully and sets it as a daily newspaper that learns what you like to read.",
      },
      { property: "og:title", content: "The Morrow — your personal morning newspaper" },
      {
        property: "og:description",
        content: "Real stories from trusted newsrooms, summarised and printed as one paper made for you, every morning.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Newspaper,
    title: "Real reporting only",
    body: "Every story comes from a named newsroom's public feed, with a link back to the original article.",
  },
  {
    icon: Sparkles,
    title: "Faithful summaries",
    body: "Each story is summarised strictly from the publisher's own text, in the length you prefer.",
  },
  {
    icon: Target,
    title: "Learns as you read",
    body: "Likes, saves, reads and skips shape tomorrow's paper. One slot stays open for a surprise.",
  },
  {
    icon: Download,
    title: "Print it as a PDF",
    body: "Download any edition as a three-column broadsheet with photographs and clickable links.",
  },
  {
    icon: Archive,
    title: "A proper archive",
    body: "Every edition is kept exactly as it was printed, so you can return to any morning.",
  },
  {
    icon: BookOpen,
    title: "Explore the wire",
    body: "Search the full news wire by keyword, section and source when you want more than the paper.",
  },
];

const STEPS = [
  { n: "I", title: "Tell us what you follow", body: "Pick at least two of 16 sections, add subjects you care about and choose a paper length." },
  { n: "II", title: "We go to press", body: "Fresh stories are gathered from trusted sources, ranked for you and summarised." },
  { n: "III", title: "Read, react, repeat", body: "Your reactions teach the paper. Each new edition is a little more yours." },
];

function Landing() {
  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/80 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="masthead text-2xl text-ink">
            The Morrow
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="quiet" size="sm" className="uppercase tracking-[0.14em] text-[0.72rem]">
              <Link to="/auth">Sign in</Link>
            </Button>
            <Button asChild variant="editorial" size="sm" className="uppercase tracking-[0.14em] text-[0.72rem]">
              <Link to="/auth" search={{ mode: "signup" }}>
                Start free
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6">
        <Masthead left="Est. 2026" right="Printed for one reader" dateLine={`${today} · Morning edition`} />

        <section className="mt-10 grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="animate-press-in">
            <p className="kicker">The personal newspaper</p>
            <h2 className="headline mt-3 text-4xl text-ink sm:text-6xl">
              The news you care about, set as a paper made only for you.
            </h2>
            <p className="prose-news mt-6 max-w-xl text-lg text-ink-soft">
              Every morning The Morrow gathers stories from trusted newsrooms, summarises them
              faithfully and lays them out like a real broadsheet — a lead story, a front page and
              your own sections. The more you read, the better it knows you.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="editorial" size="lg" className="uppercase tracking-[0.16em]">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Start your paper <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="paper" size="lg" className="uppercase tracking-[0.16em]">
                <Link to="/auth">I'm a reader</Link>
              </Button>
            </div>
            <p className="byline mt-6">Free · No news keys needed · Takes two minutes to set up</p>
          </div>
          <figure className="paper-sheet overflow-hidden p-2">
            <img
              src={heroImg}
              alt="A folded morning newspaper beside a cup of coffee on a linen tablecloth"
              className="aspect-[16/10] w-full object-cover"
              width={1600}
              height={1000}
            />
            <figcaption className="byline px-2 pb-1 pt-2">Your edition, ready with the morning coffee.</figcaption>
          </figure>
        </section>

        <section className="mt-20">
          <div className="rule-thick" />
          <h2 className="headline py-3 text-2xl sm:text-3xl">How it works</h2>
          <div className="rule-thin" />
          <ol className="mt-8 grid gap-8 md:grid-cols-3 md:gap-0">
            {STEPS.map((s, i) => (
              <li key={s.n} className={i > 0 ? "md:border-l md:border-rule md:pl-8" : "md:pr-8"}>
                <p className="masthead text-4xl text-editorial">{s.n}</p>
                <h3 className="headline mt-2 text-xl">{s.title}</h3>
                <p className="prose-news mt-2 text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20">
          <div className="rule-thick" />
          <h2 className="headline py-3 text-2xl sm:text-3xl">What's inside</h2>
          <div className="rule-thin" />
          <div className="mt-8 grid gap-px bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-card p-6 transition-colors hover:bg-paper">
                <f.icon className="size-5 text-editorial" aria-hidden />
                <h3 className="headline mt-3 text-xl">{f.title}</h3>
                <p className="prose-news mt-2 text-[0.95rem] text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 grid gap-10 lg:grid-cols-2">
          <div>
            <p className="kicker">{TOPICS.length} sections</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {TOPICS.map((t) => (
                <span key={t.id} className="border border-ink/70 px-3 py-1 text-sm font-medium text-ink">
                  {t.label}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="kicker">Reporting from {ALL_SOURCES.length} newsrooms</p>
            <p className="prose-news mt-4 text-ink-soft">{ALL_SOURCES.join(" · ")}</p>
          </div>
        </section>

        <section className="paper-sheet mt-20 px-6 py-12 text-center sm:px-12">
          <p className="kicker">Tomorrow's paper is waiting</p>
          <h2 className="headline mx-auto mt-3 max-w-2xl text-3xl sm:text-5xl">Start reading a paper that reads you back.</h2>
          <Button asChild variant="editorial" size="lg" className="mt-8 uppercase tracking-[0.16em]">
            <Link to="/auth" search={{ mode: "signup" }}>
              Create your edition <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>

      <footer className="border-t-2 border-ink">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 sm:flex-row sm:px-6">
          <span className="masthead text-xl">The Morrow</span>
          <span className="byline">Summaries are written from each publisher's own feed · Links lead to the original reporting</span>
        </div>
      </footer>
    </div>
  );
}
