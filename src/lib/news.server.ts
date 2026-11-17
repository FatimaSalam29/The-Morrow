// Server-only news pipeline: fetch real RSS feeds, cache articles, write AI summaries.
// Imported dynamically from server-function handlers only.
import { generateResponse, GatewayError } from "@lovable.dev/ai-gateway";
import { TOPIC_BY_ID } from "./feeds";
import { parseFeed } from "./rss";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];

export interface ArticleRow {
  id: string;
  url: string;
  title: string;
  description: string | null;
  image_url: string | null;
  source: string;
  category: string;
  published_at: string | null;
  ai_summary: string | null;
}

const UA = "Mozilla/5.0 (compatible; TheMorrow/1.0)";

async function fetchFeed(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "application/rss+xml, application/xml, text/xml, */*" },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) {
      console.warn(`Feed ${url} returned ${res.status}`);
      return null;
    }
    return await res.text();
  } catch (e) {
    console.warn(`Feed ${url} failed`, e);
    return null;
  }
}

/** Pull fresh items for the given sections into the shared articles cache. */
export async function ingestCategories(admin: Admin, categories: string[]) {
  const jobs = categories.flatMap((cat) =>
    (TOPIC_BY_ID[cat]?.feeds ?? []).map(async (feed) => {
      const xml = await fetchFeed(feed.url);
      if (!xml) return [];
      return parseFeed(xml)
        .slice(0, 25)
        .map((i) => ({
          url: i.url,
          title: i.title.slice(0, 400),
          description: i.description,
          image_url: i.imageUrl,
          source: feed.source,
          category: cat,
          published_at: i.publishedAt,
        }));
    }),
  );
  const results = await Promise.all(jobs);
  const byUrl = new Map<string, (typeof results)[number][number]>();
  for (const r of results.flat()) if (!byUrl.has(r.url)) byUrl.set(r.url, r);
  const rows = [...byUrl.values()];
  let feedsOk = results.filter((r) => r.length > 0).length;
  for (let i = 0; i < rows.length; i += 200) {
    const { error } = await admin
      .from("articles")
      .upsert(rows.slice(i, i + 200), { onConflict: "url", ignoreDuplicates: true });
    if (error) throw new Error(`Could not store articles: ${error.message}`);
  }
  return { fetched: rows.length, feedsOk, feedsTotal: jobs.length };
}

export async function loadCandidates(admin: Admin, categories: string[]): Promise<ArticleRow[]> {
  const since = new Date(Date.now() - 4 * 864e5).toISOString();
  const { data, error } = await admin
    .from("articles")
    .select("id,url,title,description,image_url,source,category,published_at,ai_summary")
    .in("category", categories)
    .or(`published_at.gte.${since},and(published_at.is.null,created_at.gte.${since})`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(800);
  if (error) throw new Error(`Could not load articles: ${error.message}`);
  return data ?? [];
}

const STYLE_GUIDE: Record<string, string> = {
  brief: "one crisp sentence (max 30 words)",
  balanced: "two or three sentences (40-70 words)",
  detailed: "a short paragraph of 70-110 words ending with why it matters",
};

/**
 * Summarise articles strictly from their feed text and write a short editor's
 * note. Returns null note on AI failure; callers fall back to feed text.
 */
export async function summarise(
  admin: Admin,
  articles: ArticleRow[],
  style: string,
  readerName: string | null,
  dateLabel: string,
): Promise<{ note: string | null; summaries: Record<string, string> }> {
  const summaries: Record<string, string> = {};
  if (!articles.length) return { note: null, summaries };
  const payload = articles.map((a) => ({
    id: a.id,
    section: a.category,
    source: a.source,
    title: a.title,
    feed_text: (a.description ?? "").slice(0, 500),
    needs_summary: !a.ai_summary,
  }));
  try {
    const res = await generateResponse({
      model: "openai/gpt-6-astra",
      reasoning: { effort: "low" },
      instructions:
        "You are the night editor of a personal morning newspaper. You must ONLY use facts present in the provided title and feed_text of each article. Never invent facts, quotes, numbers, names or sources. If feed_text is thin, summarise just what the title states. Write in neutral, elegant newspaper English.",
      input: [
        {
          role: "user",
          content: `Edition date: ${dateLabel}. Reader: ${readerName ?? "the reader"}.
For every article with needs_summary=true, write a summary of ${STYLE_GUIDE[style] ?? STYLE_GUIDE["balanced"]}.
Then write "note": a warm 2-3 sentence editor's note for the top of today's paper that names a few of the actual headlines below. No facts beyond the articles.
Articles JSON:
${JSON.stringify(payload)}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "edition",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["note", "summaries"],
            properties: {
              note: { type: "string" },
              summaries: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "summary"],
                  properties: { id: { type: "string" }, summary: { type: "string" } },
                },
              },
            },
          },
        },
      },
    });
    let textOut = "";
    for (const item of res.output ?? []) {
      if (item.type === "message") {
        for (const c of item.content ?? []) if (c.type === "output_text") textOut += c.text;
      }
    }
    const parsed = JSON.parse(textOut) as { note: string; summaries: { id: string; summary: string }[] };
    const valid = new Set(articles.map((a) => a.id));
    for (const s of parsed.summaries ?? []) {
      if (valid.has(s.id) && s.summary?.trim()) summaries[s.id] = s.summary.trim();
    }
    await Promise.all(
      Object.entries(summaries).map(([id, summary]) =>
        admin.from("articles").update({ ai_summary: summary }).eq("id", id).is("ai_summary", null),
      ),
    );
    return { note: parsed.note?.trim() || null, summaries };
  } catch (e) {
    if (e instanceof GatewayError) {
      console.error("AI summary failed", e.code, e.httpStatus, e.message);
    } else {
      console.error("AI summary failed", e);
    }
    return { note: null, summaries };
  }
}
