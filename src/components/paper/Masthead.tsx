import { cn } from "@/lib/utils";

export function Masthead({
  title = "The Morning Paper",
  dateLine,
  left,
  right,
  size = "xl",
}: {
  title?: string;
  dateLine?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  size?: "md" | "xl";
}) {
  return (
    <header className="text-center">
      <div className="byline flex items-center justify-between gap-4 pb-2">
        <span className="truncate">{left}</span>
        <span className="truncate">{right}</span>
      </div>
      <div className="rule-thick" />
      <h1
        className={cn(
          "masthead py-3 text-ink",
          size === "xl" ? "text-5xl sm:text-7xl lg:text-8xl" : "text-4xl sm:text-5xl",
        )}
      >
        {title}
      </h1>
      <div className="rule-double" />
      {dateLine && <div className="byline py-2 text-ink-soft">{dateLine}</div>}
      {dateLine && <div className="rule-thin" />}
    </header>
  );
}
