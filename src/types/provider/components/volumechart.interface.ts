// ─── Provider Volume Chart ───────────────────────────────────────────────────

export interface BarData {
  label: string;
  h:     number; // height % (0-100)
}

export interface ChartStat {
  label: string;
  value: string;
  token: "purple" | "slate" | "green";
}