import { describe, expect, it } from "vitest";
import { computeAffinity, selectEdition, type Candidate, type Signal } from "./recommend";

const now = new Date("2026-11-16T08:00:00Z");
const mk = (id: string, category: string, source = "BBC News", extra: Partial<Candidate> = {}): Candidate => ({
  id,
  title: `Story ${id}`,
  description: null,
  category,
  source,
  published_at: "2026-11-16T06:00:00Z",
  image_url: null,
  ...extra,
});

const profile = { topics: ["technology"], keywords: [], blocked_sources: [] };

describe("recommendation rules", () => {
  it("weights save 4, like 3, read 1, skip -2", () => {
    const sig = (action: Signal["action"]): Signal => ({ action, category: "x", source: null, article_id: "a" });
    // tanh(4/6) for a single save
    expect(computeAffinity([sig("save")]).categories["x"]).toBeCloseTo(Math.tanh(4 / 6));
    expect(computeAffinity([sig("like")]).categories["x"]).toBeCloseTo(Math.tanh(3 / 6));
    expect(computeAffinity([sig("read")]).categories["x"]).toBeCloseTo(Math.tanh(1 / 6));
    expect(computeAffinity([sig("skip")]).categories["x"]).toBeCloseTo(Math.tanh(-2 / 6));
  });

  it("never includes articles the reader skipped", () => {
    const cands = [mk("a", "technology"), mk("b", "technology")];
    const out = selectEdition(cands, profile, [{ action: "skip", category: "technology", source: "BBC News", article_id: "a" }], { size: 5, now });
    expect(out.map((o) => o.article.id)).not.toContain("a");
  });

  it("never includes blocked sources", () => {
    const cands = [mk("a", "technology", "Wired"), mk("b", "technology", "The Verge")];
    const out = selectEdition(cands, { ...profile, blocked_sources: ["Wired"] }, [], { size: 5, now });
    expect(out.map((o) => o.article.id)).toEqual(["b"]);
  });

  it("does not repeat stories from previous editions", () => {
    const cands = [mk("a", "technology"), mk("b", "technology")];
    const out = selectEdition(cands, profile, [], { size: 5, now, excludeIds: new Set(["a"]) });
    expect(out.map((o) => o.article.id)).toEqual(["b"]);
  });

  it("ranks a learned section above an unfollowed one after likes", () => {
    const cands = [mk("s1", "sport"), mk("c1", "culture")];
    const signals: Signal[] = [1, 2, 3].map((i) => ({ action: "like", category: "culture", source: null, article_id: `old${i}` }));
    const out = selectEdition(cands, { topics: [], keywords: [], blocked_sources: [] }, signals, { size: 1, now });
    expect(out[0]?.article.id).toBe("c1");
  });

  it("boosts stories matching followed keywords", () => {
    const cands = [mk("a", "world"), mk("b", "world", "BBC News", { title: "Cricket final tonight" })];
    const out = selectEdition(cands, { topics: [], keywords: ["cricket"], blocked_sources: [] }, [], { size: 1, now });
    expect(out[0]?.article.id).toBe("b");
  });

  it("returns no more stories than the edition size", () => {
    const cands = Array.from({ length: 30 }, (_, i) => mk(`t${i}`, i % 2 ? "technology" : "world"));
    expect(selectEdition(cands, profile, [], { size: 12, now })).toHaveLength(12);
  });
});

describe("discovery slot", () => {
  it("keeps one story from outside followed sections", () => {
    const cands = [...Array.from({ length: 10 }, (_, i) => mk(`t${i}`, "technology")), mk("x", "food")];
    const out = selectEdition(cands, profile, [], { size: 5, now });
    expect(out.filter((o) => o.article.category === "food")).toHaveLength(1);
  });
});
