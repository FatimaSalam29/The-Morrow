import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function sectionFor(i: number) {
  if (i === 0) return "lead";
  if (i <= 3) return "front";
  return "inside";
}

/** Build (or rebuild) the reader's personalised paper for a given local date. */
export const generateEdition = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ date: dateSchema, rebuild: z.boolean().optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const [{ supabaseAdmin }, news, rec, feeds] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("./news.server"),
      import("./recommend"),
      import("./feeds"),
    ]);

    const { data: existing } = await supabase
      .from("editions")
      .select("id")
      .eq("user_id", userId)
      .eq("edition_date", data.date)
      .maybeSingle();
    if (existing && !data.rebuild) return { editionId: existing.id, date: data.date, created: false };

    const { data: profile, error: pErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (pErr || !profile) throw new Error("Your reading profile could not be found.");

    const { data: signals } = await supabase
      .from("article_interactions")
      .select("action,category,source,article_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000);
    const sig = (signals ?? []) as import("./recommend").Signal[];

    const readerProfile = {
      topics: profile.topics ?? [],
      keywords: profile.keywords ?? [],
      blocked_sources: profile.blocked_sources ?? [],
    };
    const affinity = rec.computeAffinity(sig);
    const daySeed = Number(data.date.replace(/-/g, ""));
    const categories = rec.categoriesToFetch(
      readerProfile,
      affinity,
      feeds.TOPICS.map((t) => t.id),
      daySeed,
    );

    const ingest = await news.ingestCategories(supabaseAdmin, categories);
    const candidates = await news.loadCandidates(supabaseAdmin, categories);
    if (!candidates.length) {
      throw new Error(
        `We couldn't reach the news wires right now (${ingest.feedsOk}/${ingest.feedsTotal} sources answered). Please try again in a minute.`,
      );
    }

    // Exclude stories printed in earlier editions.
    const { data: prior } = await supabase
      .from("edition_articles")
      .select("article_id, editions!inner(edition_date)")
      .eq("user_id", userId)
      .neq("editions.edition_date", data.date)
      .limit(2000);
    const exclude = new Set((prior ?? []).map((p) => p.article_id));

    const picked = rec.selectEdition(candidates, readerProfile, sig, {
      size: Math.min(20, Math.max(6, profile.edition_size ?? 12)),
      excludeIds: exclude,
    });

    const dateLabel = new Date(`${data.date}T12:00:00Z`).toDateString();
    const { note } = await news.summarise(
      supabaseAdmin,
      picked.map((p) => p.article),
      profile.summary_style,
      profile.display_name,
      dateLabel,
    );

    if (existing) await supabase.from("editions").delete().eq("id", existing.id);
    const { count } = await supabase
      .from("editions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    const { data: edition, error: eErr } = await supabase
      .from("editions")
      .insert({
        user_id: userId,
        edition_date: data.date,
        edition_number: (count ?? 0) + 1,
        headline_note: note,
      })
      .select("id")
      .single();
    if (eErr || !edition) throw new Error(`Could not save the edition: ${eErr?.message}`);

    const { error: aErr } = await supabase.from("edition_articles").insert(
      picked.map((p, i) => ({
        edition_id: edition.id,
        article_id: p.article.id,
        user_id: userId,
        position: i,
        section: sectionFor(i),
        score: Number(p.score.toFixed(3)),
        reason: p.reason,
      })),
    );
    if (aErr) throw new Error(`Could not save the edition's stories: ${aErr.message}`);

    return { editionId: edition.id, date: data.date, created: true };
  });

/** Refresh the news wire across every section (used by Explore). */
export const refreshWire = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const [{ supabaseAdmin }, news, feeds] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("./news.server"),
      import("./feeds"),
    ]);
    const res = await news.ingestCategories(
      supabaseAdmin,
      feeds.TOPICS.map((t) => t.id),
    );
    return res;
  });
