import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-14 text-center">
      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="font-display text-lg">{title}</div>
      <div className="text-sm text-muted-foreground max-w-md">{desc}</div>
      <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
        Live backend connected
      </div>
    </div>
  );
}
