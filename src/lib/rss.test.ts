import { describe, expect, it } from "vitest";
import { parseFeed, stripHtml } from "./rss";

const rss = `<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
<channel>
  <item>
    <title>Markets rally &amp; recover</title>
    <link>https://example.com/a</link>
    <description><![CDATA[<p>Stocks <b>rose</b> today.</p>]]></description>
    <pubDate>Mon, 16 Nov 2026 06:00:00 GMT</pubDate>
    <media:content url="https://img.example.com/small.jpg" width="100"/>
    <media:content url="https://img.example.com/big.jpg" width="1200"/>
  </item>
  <item>
    <title></title>
    <link>https://example.com/no-title</link>
  </item>
  <item>
    <title>Relative link is dropped</title>
    <link>/local/path</link>
  </item>
</channel>
</rss>`;

const atom = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <title>Atom story</title>
    <link rel="alternate" href="https://example.org/atom-1"/>
    <summary>Short summary</summary>
    <updated>2026-11-15T10:00:00Z</updated>
  </entry>
</feed>`;

describe("feed parsing", () => {
  it("reads RSS items and decodes entities", () => {
    const items = parseFeed(rss);
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe("Markets rally & recover");
    expect(items[0]!.url).toBe("https://example.com/a");
    expect(items[0]!.description).toBe("Stocks rose today.");
    expect(items[0]!.publishedAt).toBe("2026-11-16T06:00:00.000Z");
  });

  it("picks the widest media image", () => {
    expect(parseFeed(rss)[0]!.imageUrl).toBe("https://img.example.com/big.jpg");
  });

  it("skips items with no title or no absolute link", () => {
    const urls = parseFeed(rss).map((i) => i.url);
    expect(urls).not.toContain("https://example.com/no-title");
    expect(urls).not.toContain("/local/path");
  });

  it("reads Atom entries", () => {
    const item = parseFeed(atom)[0]!;
    expect(item.url).toBe("https://example.org/atom-1");
    expect(item.description).toBe("Short summary");
    expect(item.imageUrl).toBeNull();
  });

  it("returns nothing for invalid XML instead of inventing stories", () => {
    expect(parseFeed("not xml at all")).toEqual([]);
  });

  it("strips tags and scripts from summaries", () => {
    expect(stripHtml("<script>x()</script><p>Hello&nbsp;<i>world</i></p>")).toBe("Hello world");
  });
});
