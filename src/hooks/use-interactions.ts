import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { interactionsQuery, type Article } from "@/lib/queries";
import type { Action } from "@/lib/recommend";

/** Reading signals for the signed-in reader, with toggle helpers. */
export function useInteractions() {
  const qc = useQueryClient();
  const q = useQuery(interactionsQuery());
  // Likes/saves cleared by a skip, so "Undo skip" can put them back.
  const clearedBySkip = useRef(new Map<string, Action[]>());

  const byArticle = useMemo(() => {
    const m = new Map<string, Set<Action>>();
    for (const i of q.data ?? []) {
      if (!m.has(i.article_id)) m.set(i.article_id, new Set());
      m.get(i.article_id)!.add(i.action as Action);
    }
    return m;
  }, [q.data]);

  const mutation = useMutation({
    mutationFn: async ({ article, action, on, cleared }: { article: Article; action: Action; on: boolean; cleared?: Action[] }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Please sign in again.");
      if (on) {
        const { error } = await supabase.from("article_interactions").upsert(
          {
            user_id: u.user.id,
            article_id: article.id,
            action,
            category: article.category,
            source: article.source,
          },
          { onConflict: "user_id,article_id,action", ignoreDuplicates: true },
        );
        if (error) throw error;
        // Liking/saving something cancels an earlier skip, and vice-versa.
        const opposite: Action[] = action === "skip" ? ["like", "save"] : action === "read" ? [] : ["skip"];
        if (opposite.length) {
          await supabase
            .from("article_interactions")
            .delete()
            .eq("user_id", u.user.id)
            .eq("article_id", article.id)
            .in("action", opposite);
        }
      } else {
        const { error } = await supabase
          .from("article_interactions")
          .delete()
          .eq("user_id", u.user.id)
          .eq("article_id", article.id)
          .eq("action", action);
        if (error) throw error;
        if (action === "skip" && cleared?.length) {
          const { error: rErr } = await supabase.from("article_interactions").upsert(
            cleared.map((a) => ({
              user_id: u.user!.id,
              article_id: article.id,
              action: a,
              category: article.category,
              source: article.source,
            })),
            { onConflict: "user_id,article_id,action", ignoreDuplicates: true },
          );
          if (rErr) throw rErr;
        }
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["interactions"] });
      if (v.action === "save" || v.action === "skip") qc.invalidateQueries({ queryKey: ["saved"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not record that"),
  });

  const has = (articleId: string, action: Action) => byArticle.get(articleId)?.has(action) ?? false;

  return {
    loading: q.isLoading,
    all: q.data ?? [],
    has,
    toggle: (article: Article, action: Action) => {
      const on = !has(article.id, action);
      let cleared: Action[] | undefined;
      if (action === "skip" && on) {
        clearedBySkip.current.set(article.id, (["like", "save"] as Action[]).filter((a) => has(article.id, a)));
      } else if (action === "skip") {
        cleared = clearedBySkip.current.get(article.id);
        clearedBySkip.current.delete(article.id);
      }
      mutation.mutate({ article, action, on, cleared });
    },
    markRead: (article: Article) => {
      if (!has(article.id, "read")) mutation.mutate({ article, action: "read", on: true });
    },
  };
}
