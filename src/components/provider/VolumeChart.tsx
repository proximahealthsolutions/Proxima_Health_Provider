import Card, { CardHeader } from "@/components/shared/Card";
import { BarData, ChartStat } from "@/types";

const statColor: Record<ChartStat["token"], string> = {
  purple: "text-[var(--color-primary)]",
  slate:  "text-[var(--color-text-muted)]",
  green:  "text-[var(--color-success)]",
};

type VolumeChartProps = {
  bars: BarData[];
  chartStats: ChartStat[];
};

export default function VolumeChart({ bars, chartStats }: VolumeChartProps) {
  return (
    <Card>
      <CardHeader title="Weekly Volume" subtitle="Patients seen" />

      {/* Bar chart */}
      <div className="flex items-end gap-2 px-5 pt-2 pb-1 h-32">
        {bars.map((b, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md transition-all duration-300"
              style={{
                height: `${b.h}%`,
                background: i === 3 ? "var(--color-primary)" : "var(--color-chart-bar-muted)",
              }}
              title={`${b.label}: ~${Math.round(b.h * 0.15)} patients`}
            />
            <span className="text-[10px] text-[var(--color-text-muted)]">{b.label}</span>
          </div>
        ))}
      </div>

      {/* Summary row */}
      <div className="flex justify-between px-5 pb-5 pt-3 border-t border-[var(--color-border)] mt-1">
        {chartStats.map((r, i) => (
          <div key={i}>
            <div className="text-[11px] text-[var(--color-text-muted)]">{r.label}</div>
            <div className={`text-xl font-extrabold ${statColor[r.token]}`}>{r.value}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}
