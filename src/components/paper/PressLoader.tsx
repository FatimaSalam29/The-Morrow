import { useEffect, useState } from "react";

const LINES = [
  "Calling the wire services…",
  "Reading this morning's dispatches…",
  "Weighing what matters to you…",
  "Asking the night editor for summaries…",
  "Setting the type…",
  "Running the presses…",
];

export function PressLoader({ title = "Printing your paper" }: { title?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, LINES.length - 1)), 3500);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="mx-auto max-w-lg py-24 text-center" role="status" aria-live="polite">
      <p className="kicker">Stop the presses</p>
      <h2 className="masthead mt-3 text-5xl">{title}</h2>
      <div className="relative mx-auto mt-8 h-[3px] w-64 overflow-hidden bg-rule">
        <div className="animate-ink-bar absolute inset-y-0 w-1/3 bg-ink" />
      </div>
      <p key={i} className="prose-news mt-6 animate-press-in italic text-ink-soft">
        {LINES[i]}
      </p>
    </div>
  );
}
