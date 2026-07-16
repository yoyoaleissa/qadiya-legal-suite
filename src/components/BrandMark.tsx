import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  showWordmark = true,
  invert = false,
}: {
  className?: string;
  showWordmark?: boolean;
  invert?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "grid h-9 w-9 place-items-center rounded-lg bg-gradient-gold shadow-gold",
          invert && "bg-gradient-gold",
        )}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-gold-foreground"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v18" />
          <path d="M7 21h10" />
          <path d="M5 7h14" />
          <path d="M9 7 6 13a3 3 0 0 0 6 0L9 7Z" opacity={0.9} />
          <path d="M15 7l-3 6a3 3 0 0 0 6 0l-3-6Z" opacity={0.9} />
          <circle cx="12" cy="4" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      </span>
      {showWordmark && (
        <div className="leading-none">
          <span
            className={cn(
              "font-display text-lg font-semibold tracking-tight",
              invert ? "text-primary-foreground" : "text-foreground",
            )}
          >
            Qadiya <span className="text-gradient-gold">OS</span>
          </span>
        </div>
      )}
    </div>
  );
}
