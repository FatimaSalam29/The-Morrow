import { Bookmark, ExternalLink, Heart, EyeOff, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Article } from "@/lib/queries";
import type { useInteractions } from "@/hooks/use-interactions";

type Ix = ReturnType<typeof useInteractions>;

export function StoryActions({ article, ix, compact }: { article: Article; ix: Ix; compact?: boolean }) {
  const liked = ix.has(article.id, "like");
  const saved = ix.has(article.id, "save");
  const skipped = ix.has(article.id, "skip");
  const btn = "inline-flex items-center gap-1.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] transition-colors";
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => ix.markRead(article)}
        className={cn(btn, "text-editorial hover:text-ink")}
      >
        <ExternalLink className="size-3.5" /> {compact ? "Source" : `Read at ${article.source}`}
      </a>
      <button
        type="button"
        aria-pressed={liked}
        onClick={() => ix.toggle(article, "like")}
        className={cn(btn, liked ? "text-editorial" : "text-muted-foreground hover:text-ink")}
      >
        <Heart className={cn("size-3.5", liked && "fill-current")} /> {liked ? "Liked" : "Like"}
      </button>
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => ix.toggle(article, "save")}
        className={cn(btn, saved ? "text-ink" : "text-muted-foreground hover:text-ink")}
      >
        <Bookmark className={cn("size-3.5", saved && "fill-current")} /> {saved ? "Saved" : "Save"}
      </button>
      <button
        type="button"
        aria-pressed={skipped}
        onClick={() => ix.toggle(article, "skip")}
        className={cn(btn, "text-muted-foreground hover:text-ink")}
      >
        {skipped ? <Undo2 className="size-3.5" /> : <EyeOff className="size-3.5" />} {skipped ? "Undo skip" : "Skip"}
      </button>
    </div>
  );
}
