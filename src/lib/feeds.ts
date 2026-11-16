// Catalog of real, reputable RSS sources grouped by section.
// Browser-safe: used by onboarding (topic picker) and by the server ingester.

export type TopicId =
  | "world"
  | "politics"
  | "business"
  | "technology"
  | "ai"
  | "science"
  | "space"
  | "health"
  | "climate"
  | "sport"
  | "culture"
  | "books"
  | "food"
  | "travel"
  | "gaming"
  | "pakistan";

export interface Feed {
  source: string;
  url: string;
}

export interface Topic {
  id: TopicId;
  label: string;
  blurb: string;
  feeds: Feed[];
}

export const TOPICS: Topic[] = [
  {
    id: "world",
    label: "World",
    blurb: "Global affairs and breaking news",
    feeds: [
      { source: "BBC News", url: "https://feeds.bbci.co.uk/news/world/rss.xml" },
      { source: "The Guardian", url: "https://www.theguardian.com/world/rss" },
      { source: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml" },
    ],
  },
  {
    id: "politics",
    label: "Politics",
    blurb: "Power, policy and elections",
    feeds: [{ source: "The Guardian", url: "https://www.theguardian.com/politics/rss" }],
  },
  {
    id: "business",
    label: "Business",
    blurb: "Markets, companies and the economy",
    feeds: [
      { source: "BBC News", url: "https://feeds.bbci.co.uk/news/business/rss.xml" },
      { source: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
    ],
  },
  {
    id: "technology",
    label: "Technology",
    blurb: "Gadgets, software and the internet",
    feeds: [
      { source: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
      { source: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
      { source: "Wired", url: "https://www.wired.com/feed/rss" },
    ],
  },
  {
    id: "ai",
    label: "Artificial Intelligence",
    blurb: "Models, research and the AI industry",
    feeds: [
      {
        source: "TechCrunch",
        url: "https://techcrunch.com/category/artificial-intelligence/feed/",
      },
    ],
  },
  {
    id: "science",
    label: "Science",
    blurb: "Discoveries and research",
    feeds: [
      { source: "BBC News", url: "https://feeds.bbci.co.uk/news/science_and_environment/rss.xml" },
      { source: "ScienceDaily", url: "https://www.sciencedaily.com/rss/top/science.xml" },
    ],
  },
  {
    id: "space",
    label: "Space",
    blurb: "Astronomy and exploration",
    feeds: [
      { source: "Space.com", url: "https://www.space.com/feeds/all" },
      { source: "NASA", url: "https://www.nasa.gov/news-release/feed/" },
    ],
  },
  {
    id: "health",
    label: "Health",
    blurb: "Medicine, wellbeing and care",
    feeds: [
      { source: "BBC News", url: "https://feeds.bbci.co.uk/news/health/rss.xml" },
      { source: "The Guardian", url: "https://www.theguardian.com/society/health/rss" },
    ],
  },
  {
    id: "climate",
    label: "Climate & Environment",
    blurb: "The planet and its future",
    feeds: [{ source: "The Guardian", url: "https://www.theguardian.com/environment/rss" }],
  },
  {
    id: "sport",
    label: "Sport",
    blurb: "Football, cricket and beyond",
    feeds: [{ source: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml" }],
  },
  {
    id: "culture",
    label: "Arts & Culture",
    blurb: "Film, music, TV and art",
    feeds: [
      { source: "BBC News", url: "https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml" },
      { source: "The Guardian", url: "https://www.theguardian.com/culture/rss" },
    ],
  },
  {
    id: "books",
    label: "Books",
    blurb: "Reviews and literary news",
    feeds: [{ source: "The Guardian", url: "https://www.theguardian.com/books/rss" }],
  },
  {
    id: "food",
    label: "Food",
    blurb: "Recipes, restaurants and food culture",
    feeds: [{ source: "The Guardian", url: "https://www.theguardian.com/food/rss" }],
  },
  {
    id: "travel",
    label: "Travel",
    blurb: "Places worth going",
    feeds: [{ source: "The Guardian", url: "https://www.theguardian.com/travel/rss" }],
  },
  {
    id: "gaming",
    label: "Gaming",
    blurb: "Games and the people who make them",
    feeds: [{ source: "Polygon", url: "https://www.polygon.com/rss/index.xml" }],
  },
  {
    id: "pakistan",
    label: "Pakistan",
    blurb: "National news from Pakistan",
    feeds: [
      { source: "Dawn", url: "https://www.dawn.com/feeds/home" },
      { source: "The Express Tribune", url: "https://tribune.com.pk/feed/home" },
    ],
  },
];

export const TOPIC_BY_ID: Record<string, Topic> = Object.fromEntries(TOPICS.map((t) => [t.id, t]));

export function topicLabel(id: string): string {
  return TOPIC_BY_ID[id]?.label ?? id;
}

export const ALL_SOURCES: string[] = Array.from(
  new Set(TOPICS.flatMap((t) => t.feeds.map((f) => f.source))),
).sort();

export const SUMMARY_STYLES = [
  { id: "brief", label: "Brief", blurb: "One crisp sentence per story" },
  { id: "balanced", label: "Balanced", blurb: "Two or three sentences of context" },
  { id: "detailed", label: "Detailed", blurb: "A short paragraph with why it matters" },
] as const;

export type SummaryStyle = (typeof SUMMARY_STYLES)[number]["id"];
