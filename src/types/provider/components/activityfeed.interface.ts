// ─── Provider Activity Feed ──────────────────────────────────────────────────

export type FeedDotToken = "green" | "blue" | "amber" | "red" | "purple";

export interface FeedItem {
  dot:  FeedDotToken;
  text: string;
  time: string;
}