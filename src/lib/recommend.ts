// Pure recommendation logic — no I/O. The more a reader reads, likes, saves
// or skips, the more these signals reshape what goes into tomorrow's paper.

export type Action = "read" | "skip" | "like" | "save";

export const SIGNAL_WEIGHTS: Record<Action, number> = {
  save: 4,
  like: 3,
  read: 1,
  skip: -2,
};

export interface Candidate {
  id: string;
  title: string;
  description: string | null;
  category: string;
  source: string;
  published_at: string | null;
  image_url?: string | null;
}

export interface Signal {
  action: Action;
  category: string | null;
  source: string | null;
  article_id: string;
}

export interface ReaderProfile {
  topics: string[];
  keywords: string[];
  blocked_sources: string[];
}

export interface Affinity {
  categories: Record<string, number>;
  sources: Record<string, number>;
}

/** Sum signal weights per category/source and squash into -1..1. */
export function computeAffinity(signals: Signal[]): Affinity {
  const cats: Record<string, number> = {};
  const srcs: Record<string, number> = {};
  for (const s of signals) {
    const w = SIGNAL_WEIGHTS[s.action] ?? 0;
    if (s.category) cats[s.category] = (cats[s.category] ?? 0) + w;
    if (s.source) srcs[s.source] = (srcs[s.source] ?? 0) + w;
  }
  const squash = (o: Record<string, number>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.tanh(v / 6)]));
  return { categories: squash(cats), sources: squash(srcs) };
}

export interface Scored<T extends Candidate = Candidate> {
  article: T;
  score: number;
  reason: string;
}

export function keywordHits(c: Candidate, keywords: string[]): string[] {
  const hay = `${c.title} ${c.description ?? ""}`.toLowerCase();
  return keywords.filter((k) => {
    const kw = k.trim().toLowerCase();
    return kw.length > 1 && hay.includes(kw);
  });
}

export function scoreArticle<T extends Candidate>(
  c: T,
  profile: ReaderProfile,
  affinity: Affinity,
  now: Date,
): Scored<T> | null {
  if (profile.blocked_sources.includes(c.source)) return null;

  const followed = profile.topics.includes(c.category);
  const catAff = affinity.categories[c.category] ?? 0;
  const srcAff = affinity.sources[c.source] ?? 0;
  const hits = keywordHits(c, profile.keywords);

  let recency = 0.5;
  if (c.published_at) {
    const hours = Math.max(0, (now.getTime() - new Date(c.published_at).getTime()) / 36e5);
    recency = 2 * Math.exp(-hours / 24);
  }

  const score =
    (followed ? 3 : 0) +
    2.5 * catAff +
    1 * srcAff +
    Math.min(3, hits.length * 1.5) +
    recency +
    (c.image_url ? 0.2 : 0);

  let reason: string;
  if (hits.length) reason = `Mentions “${hits[0]}”, which you follow`;
  else if (catAff > 0.35) reason = `You've been reading a lot of this section`;
  else if (followed) reason = `From a section you follow`;
  else if (srcAff > 0.35) reason = `You often read ${c.source}`;
  else reason = `A fresh discovery outside your usual sections`;

  return { article: c, score, reason };
}

export interface SelectOptions {
  size: number;
  excludeIds?: Set<string>;
  now?: Date;
}

/**
 * Rank candidates and pick a diverse edition: repeated sections are
 * gently penalised, every followed topic gets a chance, and one slot is kept
 * for a discovery outside the reader's usual sections.
 */
export function selectEdition<T extends Candidate>(
  candidates: T[],
  profile: ReaderProfile,
  signals: Signal[],
  opts: SelectOptions,
): Scored<T>[] {
  const now = opts.now ?? new Date();
  const exclude = opts.excludeIds ?? new Set<string>();
  const skipped = new Set(signals.filter((s) => s.action === "skip").map((s) => s.article_id));
  const affinity = computeAffinity(signals);

  const seenUrls = new Set<string>();
  const pool: Scored<T>[] = [];
  for (const c of candidates) {
    if (exclude.has(c.id) || skipped.has(c.id)) continue;
    const key = c.title.toLowerCase().replace(/\W+/g, " ").trim();
    if (seenUrls.has(key)) continue;
    seenUrls.add(key);
    const s = scoreArticle(c, profile, affinity, now);
    if (s) pool.push(s);
  }
  pool.sort((a, b) => b.score - a.score);

  const picked: Scored<T>[] = [];
  const perCat: Record<string, number> = {};
  const take = (s: Scored<T>) => {
    picked.push(s);
    perCat[s.article.category] = (perCat[s.article.category] ?? 0) + 1;
    pool.splice(pool.indexOf(s), 1);
  };

  // 1) best story from each followed topic, strongest topic first
  for (const t of [...profile.topics].sort(
    (a, b) => (affinity.categories[b] ?? 0) - (affinity.categories[a] ?? 0),
  )) {
    if (picked.length >= opts.size) break;
    const best = pool.find((s) => s.article.category === t);
    if (best) take(best);
  }

  // 2) reserve one discovery slot outside followed topics
  const discovery =
    opts.size >= 4 ? pool.find((s) => !profile.topics.includes(s.article.category)) : undefined;
  const reserve = discovery ? 1 : 0;

  // 3) fill the rest greedily with a diversity penalty
  while (picked.length < opts.size - reserve && pool.length) {
    let best: Scored<T> | null = null;
    let bestAdj = -Infinity;
    for (const s of pool) {
      if (s === discovery) continue;
      const adj = s.score - 0.75 * (perCat[s.article.category] ?? 0);
      if (adj > bestAdj) {
        bestAdj = adj;
        best = s;
      }
    }
    if (!best) break;
    take(best);
  }
  if (discovery && picked.length < opts.size && pool.includes(discovery)) {
    discovery.reason = "A fresh discovery outside your usual sections";
    take(discovery);
  }

  // Lead story = highest score with an image if possible.
  picked.sort((a, b) => b.score - a.score);
  const leadIdx = picked.findIndex((p) => p.article.image_url);
  if (leadIdx > 0) {
    const [lead] = picked.splice(leadIdx, 1);
    picked.unshift(lead);
  }
  return picked;
}

/** Which categories to fetch for a reader: followed topics + strong learned ones + one discovery. */
export function categoriesToFetch(
  profile: ReaderProfile,
  affinity: Affinity,
  allTopics: string[],
  daySeed: number,
): string[] {
  const learned = Object.entries(affinity.categories)
    .filter(([, v]) => v > 0.3)
    .map(([k]) => k);
  const set = new Set([...profile.topics, ...learned]);
  const others = allTopics.filter((t) => !set.has(t));
  if (others.length) set.add(others[Math.abs(daySeed) % others.length]);
  return [...set].filter((t) => allTopics.includes(t));
}
