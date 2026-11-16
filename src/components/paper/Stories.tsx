import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Article } from "@/lib/queries";
import { topicLabel } from "@/lib/feeds";
import { timeAgo } from "@/lib/dates";
import type { useInteractions } from "@/hooks/use-interactions";
import { StoryActions } from "./StoryActions";
import { ArticleReader } from "./ArticleReader";

type Ix = ReturnType<typeof useInteractions>;

export function summaryOf(a: Article) {
  return a.ai_summary || a.description || "";
}

function Img({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={cn("newsprint-img w-full object-cover", className)}
    />
  );
}

function Meta({ a, reason }: { a: Article; reason?: string | null }) {
  return (
    <div className="byline flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="font-semibold text-ink">{a.source}</span>
      {a.published_at && <span>· {timeAgo(a.published_at)}</span>}
      {reason && (
        <span className="inline-flex items-center gap-1 normal-case tracking-normal text-ink-soft">
          · <Sparkles className="size-3 text-editorial" /> {reason}
        </span>
      )}
    </div>
  );
}

function Skipped({ a, ix }: { a: Article; ix: Ix }) {
  return (
    <div className="flex items-center justify-between gap-3 border border-dashed border-rule px-4 py-3 text-sm text-muted-foreground">
      <span className="truncate">
        Skipped: <span className="italic">{a.title}</span>
      </span>
      <button className="shrink-0 font-semibold text-ink link-ink" onClick={() => ix.toggle(a, "skip")}>
        Undo
      </button>
    </div>
  );
}

export function LeadStory({ a, reason, ix }: { a: Article; reason?: string | null; ix: Ix }) {
  const [open, setOpen] = useState(false);
  if (ix.has(a.id, "skip")) return <Skipped a={a} ix={ix} />;
  return (
    <article className="group">
      <p className="kicker">{topicLabel(a.category)} · The lead</p>
      <h2 className="headline mt-2 text-3xl sm:text-5xl">
        <button className="text-left link-ink" onClick={() => setOpen(true)}>
          {a.title}
        </button>
      </h2>
      {a.image_url && (
        <figure className="mt-5 overflow-hidden">
          <Img src={a.image_url} alt={a.title} className="aspect-[16/9]" />
        </figure>
      )}
      <div className="mt-4">
        <Meta a={a} reason={reason} />
      </div>
      <p className="prose-news dropcap mt-4 text-lg text-ink">{summaryOf(a)}</p>
      <div className="mt-4">
        <StoryActions article={a} ix={ix} />
      </div>
      <ArticleReader article={a} reason={reason} open={open} onOpenChange={setOpen} ix={ix} />
    </article>
  );
}

export function FrontStory({ a, reason, ix, withImage = true }: { a: Article; reason?: string | null; ix: Ix; withImage?: boolean }) {
  const [open, setOpen] = useState(false);
  if (ix.has(a.id, "skip")) return <Skipped a={a} ix={ix} />;
  return (
    <article className="group">
      <p className="kicker">{topicLabel(a.category)}</p>
      {withImage && a.image_url && (
        <div className="mt-2 overflow-hidden">
          <Img src={a.image_url} alt={a.title} className="aspect-[3/2]" />
        </div>
      )}
      <h3 className="headline mt-2 text-xl sm:text-2xl">
        <button className="text-left link-ink" onClick={() => setOpen(true)}>
          {a.title}
        </button>
      </h3>
      <div className="mt-2">
        <Meta a={a} reason={reason} />
      </div>
      <p className="prose-news mt-2 text-[0.95rem] text-ink-soft">{summaryOf(a)}</p>
      <div className="mt-3">
        <StoryActions article={a} ix={ix} compact />
      </div>
      <ArticleReader article={a} reason={reason} open={open} onOpenChange={setOpen} ix={ix} />
    </article>
  );
}

export function BriefStory({ a, reason, ix }: { a: Article; reason?: string | null; ix: Ix }) {
  const [open, setOpen] = useState(false);
  if (ix.has(a.id, "skip")) return <Skipped a={a} ix={ix} />;
  return (
    <article className="group grid grid-cols-[1fr_auto] gap-4">
      <div>
        <h3 className="headline text-lg">
          <button className="text-left link-ink" onClick={() => setOpen(true)}>
            {a.title}
          </button>
        </h3>
        <div className="mt-1">
          <Meta a={a} reason={reason} />
        </div>
        <p className="prose-news mt-2 line-clamp-4 text-sm text-ink-soft">{summaryOf(a)}</p>
        <div className="mt-2">
          <StoryActions article={a} ix={ix} compact />
        </div>
      </div>
      {a.image_url && (
        <div className="w-24 overflow-hidden sm:w-28">
          <Img src={a.image_url} alt="" className="aspect-square" />
        </div>
      )}
      <ArticleReader article={a} reason={reason} open={open} onOpenChange={setOpen} ix={ix} />
    </article>
  );
}
