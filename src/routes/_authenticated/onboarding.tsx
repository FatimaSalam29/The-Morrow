import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { profileQuery } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { KeywordInput, SizePicker, StylePicker, TopicPicker } from "@/components/paper/PreferenceFields";
import { formatEditionDate, localISODate } from "@/lib/dates";
import { topicLabel } from "@/lib/feeds";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up your paper — The Morning Paper" },
      { name: "description", content: "Tell us what you care about and we'll set your first edition." },
      { property: "og:title", content: "Set up your paper — The Morning Paper" },
      { property: "og:description", content: "Tell us what you care about and we'll set your first edition." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

const STEPS = ["Welcome", "Sections", "Subjects", "Your reading", "Proof"];

function Onboarding() {
  const { data: profile } = useQuery(profileQuery());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [style, setStyle] = useState("balanced");
  const [size, setSize] = useState(12);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName((n) => n || profile.display_name || "");
    if (profile.topics.length) setTopics(profile.topics);
    if (profile.keywords.length) setKeywords(profile.keywords);
    setStyle(profile.summary_style);
    setSize(profile.edition_size);
  }, [profile]);

  const canNext = step !== 1 || topics.length >= 2;

  async function finish() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: u.user.id,
        display_name: name.trim() || null,
        topics,
        keywords,
        summary_style: style,
        edition_size: size,
        onboarded: true,
      });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["profile"] });
    navigate({ to: "/today" });
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={i <= step ? "h-1 bg-ink" : "h-1 bg-rule"} />
            <p className={`byline mt-2 hidden sm:block ${i === step ? "text-ink!" : ""}`}>{s}</p>
          </div>
        ))}
      </div>

      <div key={step} className="animate-press-in">
        {step === 0 && (
          <section className="py-6 text-center">
            <p className="kicker">Subscriber No. 1 of 1</p>
            <h2 className="masthead mt-4 text-5xl sm:text-7xl">Good morning.</h2>
            <p className="prose-news mx-auto mt-6 max-w-xl text-lg text-ink-soft">
              In the next minute we'll learn what you care about, then set a newspaper for you —
              built only from real reporting, and sharper every day you read it.
            </p>
            <div className="mx-auto mt-10 max-w-sm text-left">
              <label htmlFor="name" className="byline">Whose paper is this?</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="Your name"
                className="mt-2 h-12 w-full border-b-2 border-ink bg-transparent px-1 text-center font-serif text-2xl outline-none"
              />
            </div>
          </section>
        )}
        {step === 1 && (
          <section>
            <p className="kicker">Step two</p>
            <h2 className="headline mt-1 text-3xl sm:text-4xl">Which sections should we print?</h2>
            <p className="mt-2 text-muted-foreground">Pick at least two. You can change these any time.</p>
            <div className="mt-6">
              <TopicPicker value={topics} onChange={setTopics} />
            </div>
          </section>
        )}
        {step === 2 && (
          <section>
            <p className="kicker">Step three</p>
            <h2 className="headline mt-1 text-3xl sm:text-4xl">Anything you follow closely?</h2>
            <p className="mt-2 text-muted-foreground">
              Teams, companies, people, places. Stories that mention them rise to the top. Optional.
            </p>
            <div className="mt-6">
              <KeywordInput value={keywords} onChange={setKeywords} />
            </div>
          </section>
        )}
        {step === 3 && (
          <section className="grid gap-10">
            <div>
              <p className="kicker">Step four</p>
              <h2 className="headline mt-1 text-3xl sm:text-4xl">How much time do you have?</h2>
              <div className="mt-5">
                <SizePicker value={size} onChange={setSize} />
              </div>
            </div>
            <div>
              <h3 className="headline text-2xl">How should we write your summaries?</h3>
              <div className="mt-5">
                <StylePicker value={style} onChange={setStyle} />
              </div>
            </div>
          </section>
        )}
        {step === 4 && (
          <section className="paper-sheet mx-auto max-w-2xl p-8 text-center">
            <p className="byline">Proof for approval</p>
            <h2 className="masthead mt-3 text-4xl sm:text-5xl">
              {name.trim() ? `The ${name.trim()} Times` : "The Morning Paper"}
            </h2>
            <div className="rule-double mt-3" />
            <p className="byline py-2">{formatEditionDate(localISODate())} · First edition</p>
            <div className="rule-thin" />
            <dl className="mt-6 grid gap-4 text-left sm:grid-cols-2">
              <div>
                <dt className="kicker">Sections</dt>
                <dd className="prose-news mt-1">{topics.map(topicLabel).join(", ")}</dd>
              </div>
              <div>
                <dt className="kicker">Following</dt>
                <dd className="prose-news mt-1">{keywords.length ? keywords.join(", ") : "—"}</dd>
              </div>
              <div>
                <dt className="kicker">Length</dt>
                <dd className="prose-news mt-1">{size} stories</dd>
              </div>
              <div>
                <dt className="kicker">Summaries</dt>
                <dd className="prose-news mt-1 capitalize">{style}</dd>
              </div>
            </dl>
          </section>
        )}
      </div>

      <div className="mt-10 flex items-center justify-between border-t border-rule pt-6">
        <Button variant="quiet" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
          <ArrowLeft /> Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button size="lg" disabled={!canNext} onClick={() => setStep((s) => s + 1)} className="uppercase tracking-[0.14em]">
            {step === 1 && topics.length < 2 ? `Pick ${2 - topics.length} more` : "Continue"} <ArrowRight />
          </Button>
        ) : (
          <Button size="lg" variant="editorial" disabled={saving} onClick={finish} className="uppercase tracking-[0.14em]">
            {saving ? "Saving…" : "Print my first edition"}
          </Button>
        )}
      </div>
    </div>
  );
}
