import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { KeywordInput, SizePicker, SourceBlocker, StylePicker, TopicPicker } from "@/components/paper/PreferenceFields";
import { profileQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Preferences — The Morning Paper" },
      { name: "description", content: "Tune the sections, subjects and style of your paper." },
      { property: "og:title", content: "Preferences — The Morning Paper" },
      { property: "og:description", content: "Tune the sections, subjects and style of your paper." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Settings,
});

function Settings() {
  const { data: profile, isLoading } = useQuery(profileQuery());
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [style, setStyle] = useState("balanced");
  const [size, setSize] = useState(12);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setName(profile.display_name ?? "");
    setTopics(profile.topics);
    setKeywords(profile.keywords);
    setBlocked(profile.blocked_sources);
    setStyle(profile.summary_style);
    setSize(profile.edition_size);
  }, [profile]);

  async function save() {
    if (!profile) return;
    if (topics.length < 1) {
      toast.error("Pick at least one section.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name.trim() || null, topics, keywords, blocked_sources: blocked, summary_style: style, edition_size: size })
      .eq("id", profile.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["profile"] });
    toast.success("Preferences saved. Tomorrow's paper will reflect them — or reprint today's.");
  }

  async function resetLearning() {
    if (!profile) return;
    const { error } = await supabase.from("article_interactions").delete().eq("user_id", profile.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["interactions"] });
    qc.invalidateQueries({ queryKey: ["saved"] });
    toast.success("Reading history cleared.");
  }

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <div className="animate-press-in grid gap-12">
      <div>
        <p className="kicker">Reader services</p>
        <h1 className="headline mt-2 text-4xl sm:text-5xl">Preferences</h1>
      </div>

      <Block title="Name on the masthead">
        <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} className="max-w-sm" />
      </Block>
      <Block title="Sections"><TopicPicker value={topics} onChange={setTopics} /></Block>
      <Block title="Subjects you follow"><KeywordInput value={keywords} onChange={setKeywords} /></Block>
      <Block title="Edition length"><SizePicker value={size} onChange={setSize} /></Block>
      <Block title="Summary style"><StylePicker value={style} onChange={setStyle} /></Block>
      <Block title="Newsrooms to leave out" hint="Tap a newsroom to stop it appearing in your paper.">
        <SourceBlocker value={blocked} onChange={setBlocked} />
      </Block>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button size="lg" variant="editorial" onClick={save} disabled={saving} className="shadow-lg uppercase tracking-[0.14em]">
          {saving ? "Saving…" : "Save preferences"}
        </Button>
      </div>

      <Block title="Learning" hint="Your reads, likes, saves and skips shape every future paper.">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="paper">Reset what the paper has learned</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Start fresh?</AlertDialogTitle>
              <AlertDialogDescription>
                This removes your reading history, likes, saves and skips. Past editions stay in the archive.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resetLearning}>Reset</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Block>
    </div>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="rule-thick" />
      <h2 className="headline py-2 text-2xl">{title}</h2>
      {hint && <p className="-mt-1 mb-2 text-sm text-muted-foreground">{hint}</p>}
      <div className="rule-thin mb-5" />
      {children}
    </section>
  );
}
