import { XMLParser } from "fast-xml-parser";

export interface ParsedItem {
  url: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  publishedAt: string | null;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  processEntities: true,
  htmlEntities: true,
});

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return text(v[0]);
  if (typeof v === "object" && "#text" in (v as Record<string, unknown>)) {
    return text((v as Record<string, unknown>)["#text"]);
  }
  return "";
}

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#039;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function attr(v: unknown, name: string): string | null {
  if (!v) return null;
  const node = Array.isArray(v) ? v[0] : v;
  if (node && typeof node === "object") {
    const val = (node as Record<string, unknown>)[`@_${name}`];
    if (typeof val === "string") return val;
  }
  return null;
}

function pickImage(item: Record<string, unknown>, html: string): string | null {
  const media = item["media:content"];
  if (Array.isArray(media)) {
    // prefer the widest image
    const sorted = [...media].sort(
      (a, b) => Number(attr(b, "width") ?? 0) - Number(attr(a, "width") ?? 0),
    );
    const u = attr(sorted[0], "url");
    if (u) return u;
  }
  const candidates = [
    attr(media, "url"),
    attr(item["media:thumbnail"], "url"),
    attr((item["media:group"] as Record<string, unknown> | undefined)?.["media:content"], "url"),
    (() => {
      const enc = item["enclosure"];
      const type = attr(enc, "type");
      return !type || type.startsWith("image") ? attr(enc, "url") : null;
    })(),
    html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null,
  ];
  const found = candidates.find((c) => c && /^https?:\/\//.test(c));
  return found ?? null;
}

function linkOf(item: Record<string, unknown>): string {
  const link = item["link"];
  if (typeof link === "string") return link.trim();
  if (Array.isArray(link)) {
    const alt = link.find((l) => attr(l, "rel") === "alternate") ?? link[0];
    return (attr(alt, "href") ?? text(alt)).trim();
  }
  if (link && typeof link === "object") return (attr(link, "href") ?? text(link)).trim();
  const guid = text(item["guid"]);
  return guid.startsWith("http") ? guid : "";
}

/** Parse an RSS 2.0 or Atom document into normalized items. Never invents data. */
export function parseFeed(xml: string): ParsedItem[] {
  let doc: Record<string, any>;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }
  const raw = doc?.["rss"]?.channel?.item ?? doc?.["feed"]?.entry ?? doc?.["rdf:RDF"]?.item ?? [];
  const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : [raw];
  const out: ParsedItem[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const url = linkOf(item);
    const title = stripHtml(text(item["title"]));
    if (!url || !/^https?:\/\//.test(url) || !title) continue;
    const html = text(item["content:encoded"]) || text(item["description"]) || text(item["summary"]) || text(item["content"]);
    const description = stripHtml(html).slice(0, 600) || null;
    const dateRaw = text(item["pubDate"]) || text(item["published"]) || text(item["updated"]) || text(item["dc:date"]);
    const d = dateRaw ? new Date(dateRaw) : null;
    out.push({
      url,
      title,
      description,
      imageUrl: pickImage(item, html),
      publishedAt: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null,
    });
  }
  return out;
}
