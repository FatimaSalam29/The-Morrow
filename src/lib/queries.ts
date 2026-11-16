import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Tables<"profiles">;
export type Article = Tables<"articles">;
export type Edition = Tables<"editions">;
export type EditionStory = Tables<"edition_articles"> & { article: Article };

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export const profileQuery = () =>
  queryOptions({
    queryKey: ["profile"],
    queryFn: async () => {
      const id = await uid();
      const { data, error } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const editionByDateQuery = (date: string) =>
  queryOptions({
    queryKey: ["edition", date],
    queryFn: async () => {
      const id = await uid();
      const { data: edition, error } = await supabase
        .from("editions")
        .select("*")
        .eq("user_id", id)
        .eq("edition_date", date)
        .maybeSingle();
      if (error) throw error;
      if (!edition) return null;
      const { data: rows, error: rErr } = await supabase
        .from("edition_articles")
        .select("*, article:articles(*)")
        .eq("edition_id", edition.id)
        .order("position");
      if (rErr) throw rErr;
      return { edition, stories: (rows ?? []) as unknown as EditionStory[] };
    },
  });

export const editionsListQuery = () =>
  queryOptions({
    queryKey: ["editions"],
    queryFn: async () => {
      const id = await uid();
      const { data, error } = await supabase
        .from("editions")
        .select("*, edition_articles(count)")
        .eq("user_id", id)
        .order("edition_date", { ascending: false })
        .limit(365);
      if (error) throw error;
      return (data ?? []) as (Edition & { edition_articles: { count: number }[] })[];
    },
  });

export type Interaction = Tables<"article_interactions">;

export const interactionsQuery = () =>
  queryOptions({
    queryKey: ["interactions"],
    queryFn: async () => {
      const id = await uid();
      const { data, error } = await supabase
        .from("article_interactions")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });

export const savedQuery = () =>
  queryOptions({
    queryKey: ["saved"],
    queryFn: async () => {
      const id = await uid();
      const { data, error } = await supabase
        .from("article_interactions")
        .select("created_at, article:articles(*)")
        .eq("user_id", id)
        .eq("action", "save")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as { created_at: string; article: Article }[];
    },
  });
