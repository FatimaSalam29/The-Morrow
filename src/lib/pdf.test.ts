import { describe, expect, it } from "vitest";
import { buildEditionPdf } from "./pdf";
import type { EditionStory } from "./queries";

const story = (i: number): EditionStory =>
  ({
    id: `ea${i}`,
    edition_id: "e1",
    article_id: `a${i}`,
    position: i,
    reason: null,
    score: 1,
    created_at: "2026-11-16T06:00:00Z",
    article: {
      id: `a${i}`,
      url: `https://example.com/story-${i}`,
      title: `Headline number ${i} about the news of the day`,
      description: "A description of the story.",
      ai_summary: "An AI summary written from the publisher's feed. ".repeat(4),
      category: i % 2 ? "technology" : "world",
      source: "BBC News",
      published_at: "2026-11-16T06:00:00Z",
      image_url: null,
    },
  }) as unknown as EditionStory;

async function render(n: number) {
  const blob = await buildEditionPdf({
    date: "2026-11-16",
    editionNumber: 3,
    readerName: "Fatima",
    note: "Good morning.",
    stories: Array.from({ length: n }, (_, i) => story(i)),
    images: {},
  });
  return await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(new TextDecoder("latin1").decode(r.result as ArrayBuffer));
    r.onerror = () => reject(r.error);
    r.readAsArrayBuffer(blob);
  });
}

describe("edition PDF", () => {
  it("is A4 (595 x 842 pt)", async () => {
    const pdf = await render(6);
    expect(pdf).toMatch(/\/MediaBox \[0 0 595\.2\d* 841\.8\d*\]/);
  });

  it("links every story to its original source", async () => {
    const pdf = await render(6);
    for (let i = 0; i < 6; i++) expect(pdf).toContain(`https://example.com/story-${i}`);
  });

  it("flows a long edition onto more than one page", async () => {
    const pdf = await render(20);
    const pages = pdf.match(/\/Type \/Page\b/g) ?? [];
    expect(pages.length).toBeGreaterThan(1);
  });
});
