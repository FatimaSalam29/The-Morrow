import { useState } from "react";
import { Check, Plus, X } from "lucide-react";
import { TOPICS, SUMMARY_STYLES, ALL_SOURCES } from "@/lib/feeds";
import { cn } from "@/lib/utils";

export function TopicPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {TOPICS.map((t) => {
        const on = value.includes(t.id);
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? value.filter((v) => v !== t.id) : [...value, t.id])}
            className={cn(
              "group relative min-w-0 break-words border p-3 text-left transition-all sm:p-4",
              on ? "border-ink bg-ink text-paper" : "border-rule bg-card hover:border-ink",
            )}
          >
            <span className="headline block pr-5 text-base hyphens-auto sm:text-lg">{t.label}</span>
            <span className={cn("mt-1 block text-xs", on ? "text-paper/70" : "text-muted-foreground")}>
              {t.blurb}
            </span>
            <span className={cn("mt-2 block text-[0.65rem] uppercase tracking-[0.12em]", on ? "text-paper/60" : "text-muted-foreground/80")}>
              {t.feeds.map((f) => f.source).join(" · ")}
            </span>
            {on && <Check className="absolute right-3 top-3 size-4 text-editorial-foreground" />}
          </button>
        );
      })}
    </div>
  );
}

const SUGGESTIONS = ["Cricket", "Climate", "OpenAI", "Startups", "Football", "Elections", "Mars", "Karachi", "Formula 1", "Vaccines", "Crypto", "Film"];

export function KeywordInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = (k: string) => {
    const kw = k.trim();
    if (!kw || value.some((v) => v.toLowerCase() === kw.toLowerCase()) || value.length >= 20) return;
    onChange([...value, kw]);
    setDraft("");
  };
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(draft);
        }}
        className="flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={40}
          placeholder="Type a subject, person or place…"
          className="h-11 min-w-0 flex-1 border-b-2 border-ink bg-transparent px-1 font-serif text-lg outline-none placeholder:text-muted-foreground/70"
        />
        <button type="submit" className="flex h-11 shrink-0 items-center gap-1 px-3 text-sm font-semibold uppercase tracking-wider text-editorial">
          <Plus className="size-4" /> Add
        </button>
      </form>
      <div className="mt-4 flex flex-wrap gap-2">
        {value.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 border border-ink bg-ink px-3 py-1 text-sm text-paper">
            {k}
            <button type="button" aria-label={`Remove ${k}`} onClick={() => onChange(value.filter((v) => v !== k))}>
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <p className="byline mt-6">Suggestions</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {SUGGESTIONS.filter((s) => !value.includes(s)).map((s) => (
          <button key={s} type="button" onClick={() => add(s)} className="border border-dashed border-rule px-3 py-1 text-sm text-ink-soft hover:border-ink hover:text-ink">
            + {s}
          </button>
        ))}
      </div>
    </div>
  );
}

export function StylePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {SUMMARY_STYLES.map((s) => (
        <button
          key={s.id}
          type="button"
          aria-pressed={value === s.id}
          onClick={() => onChange(s.id)}
          className={cn("border p-4 text-left transition-colors", value === s.id ? "border-ink bg-paper-deep" : "border-rule bg-card hover:border-ink")}
        >
          <span className="headline block text-lg">{s.label}</span>
          <span className="mt-1 block text-xs text-muted-foreground">{s.blurb}</span>
        </button>
      ))}
    </div>
  );
}

export const SIZES = [
  { size: 6, label: "A quick read", minutes: 5 },
  { size: 12, label: "With my coffee", minutes: 10 },
  { size: 18, label: "The full spread", minutes: 20 },
];

export function SizePicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {SIZES.map((s) => (
        <button
          key={s.size}
          type="button"
          aria-pressed={value === s.size}
          onClick={() => onChange(s.size)}
          className={cn("border p-4 text-left transition-colors", value === s.size ? "border-ink bg-paper-deep" : "border-rule bg-card hover:border-ink")}
        >
          <span className="headline block text-lg">{s.label}</span>
          <span className="mt-1 block text-xs text-muted-foreground">
            ~{s.minutes} minutes · {s.size} stories
          </span>
        </button>
      ))}
    </div>
  );
}

export function SourceBlocker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {ALL_SOURCES.map((s) => {
        const blocked = value.includes(s);
        return (
          <button
            key={s}
            type="button"
            aria-pressed={blocked}
            onClick={() => onChange(blocked ? value.filter((v) => v !== s) : [...value, s])}
            className={cn(
              "border px-3 py-1 text-sm transition-colors",
              blocked ? "border-destructive text-destructive line-through" : "border-rule text-ink-soft hover:border-ink",
            )}
          >
            {s}
          </button>
        );
      })}
    </div>
  );
}
