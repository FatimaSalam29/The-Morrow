import { ExternalLink, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Article } from "@/lib/queries";
import { topicLabel } from "@/lib/feeds";
import type { useInteractions } from "@/hooks/use-interactions";
import { StoryActions } from "./StoryActions";

type Ix = ReturnType<typeof useInteractions>;

export function ArticleReader({
  article: a,
  reason,
  open,
  onOpenChange,
  ix,
}: {
  article: Article;
  reason?: string | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  ix: Ix;
}) {
  useEffect(() => {
    if (open) ix.markRead(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-none border-ink bg-card p-0">
        {a.image_url && (
          <img src={a.image_url} alt="" referrerPolicy="no-referrer" className="aspect-[16/9] w-full object-cover" />
        )}
        <div className="p-6 sm:p-8">
          <p className="kicker">{topicLabel(a.category)} · {a.source}</p>
          <DialogTitle className="headline mt-2 text-3xl">{a.title}</DialogTitle>
          {a.published_at && (
            <p className="byline mt-2">
              Published {new Date(a.published_at).toLocaleString("en-GB", { dateStyle: "full", timeStyle: "short" })}
            </p>
          )}
          {a.ai_summary && (
            <div className="mt-6 border-l-2 border-editorial pl-4">
              <p className="byline flex items-center gap-1 text-editorial">
                <Sparkles className="size-3" /> AI summary of the report
              </p>
              <DialogDescription className="prose-news mt-2 text-lg text-ink">{a.ai_summary}</DialogDescription>
            </div>
          )}
          {a.description && (
            <div className="mt-6">
              <p className="byline">From {a.source}</p>
              <p className="prose-news mt-2 text-ink-soft">{a.description}</p>
            </div>
          )}
          {reason && <p className="mt-6 text-sm italic text-muted-foreground">Why it's in your paper: {reason}.</p>}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-5">
            <StoryActions article={a} ix={ix} compact />
            <Button asChild variant="editorial">
              <a href={a.url} target="_blank" rel="noopener noreferrer">
                Full story at {a.source} <ExternalLink />
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
