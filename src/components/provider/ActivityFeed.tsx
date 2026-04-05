import Card, { CardHeader } from "@/components/shared/Card";
import { FeedItem, FeedDotToken } from "@/types";
import { cn } from "@/lib/utils";

const dotColor: Record<FeedDotToken, string> = {
  green:  "bg-[var(--color-success)]",
  blue:   "bg-[var(--color-info)]",
  amber:  "bg-[var(--color-warning)]",
  red:    "bg-[var(--color-danger)]",
  purple: "bg-[var(--color-primary)]",
};

type ActivityFeedProps = {
  items: FeedItem[];
};

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader title="Recent Activity" subtitle="Today" />
      <div className="divide-y divide-[var(--color-border)]">
        {items.length === 0 && (
          <div className="px-5 py-6 text-sm text-[var(--color-text-muted)]">
            No activity yet.
          </div>
        )}
        {items.map((f, i) => (
          <div key={i} className="flex items-start gap-3 px-5 py-3">
            <span className={cn("w-2 h-2 rounded-full mt-1.5 shrink-0", dotColor[f.dot])} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[var(--color-text)] leading-snug">{f.text}</p>
              <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">{f.time}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
