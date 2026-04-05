import { ProviderStatCard, ProviderStatToken } from "@/types";
import Icon, { IconName } from "@/components/shared/Icon";

const tokenStyles: Record<ProviderStatToken, { icon: string; text: string; bg: string }> = {
  purple: { icon: "bg-[var(--color-surface-soft)]", text: "text-[var(--color-text)]", bg: "bg-[var(--color-primary)]" },
  red:    { icon: "bg-[var(--color-surface-soft)]", text: "text-[var(--color-text)]", bg: "bg-[var(--color-danger)]"    },
  green:  { icon: "bg-[var(--color-surface-soft)]", text: "text-[var(--color-text)]", bg: "bg-[var(--color-accent)]" },
  blue:   { icon: "bg-[var(--color-surface-soft)]", text: "text-[var(--color-text)]", bg: "bg-[var(--color-primary)]" },
};

type ProviderStatsRowProps = {
  stats: ProviderStatCard[];
};

export default function ProviderStatsRow({ stats }: ProviderStatsRowProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((s, i) => {
        const t = tokenStyles[s.token];
        return (
          <div key={i} className="relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5 overflow-hidden">
            <div className={`absolute top-0 right-0 w-16 h-16 rounded-bl-[4rem] opacity-10 ${t.bg}`} />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${t.icon} ${t.text}`}>
              <Icon name={s.icon as IconName} className="w-5 h-5" />
            </div>
            <div className="text-2xl font-bold text-[var(--color-text)] leading-tight">{s.value}</div>
            <div className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-snug">{s.label}</div>
            <div className={`text-[11px] font-medium mt-2 ${
              s.up === true ? "text-[var(--color-success)]" : s.up === false ? "text-[var(--color-danger)]" : "text-[var(--color-text-muted)]"
            }`}>
              {s.delta}
            </div>
          </div>
        );
      })}
    </div>
  );
}
