import { cn } from "@/lib/utils";
import { AvatarProps, AvatarSize, AvatarColor } from "@/types";

const sizeMap: Record<AvatarSize, { sizeClass: string; textClass: string; radiusClass: string }> = {
  xs: { sizeClass: "w-7 h-7",   textClass: "text-[10px]", radiusClass: "rounded-[7px]"  },
  sm: { sizeClass: "w-8 h-8",   textClass: "text-[11px]", radiusClass: "rounded-[8px]"  },
  md: { sizeClass: "w-10 h-10", textClass: "text-sm",     radiusClass: "rounded-[10px]" },
  lg: { sizeClass: "w-12 h-12", textClass: "text-base",   radiusClass: "rounded-[12px]" },
  xl: { sizeClass: "w-14 h-14", textClass: "text-lg",     radiusClass: "rounded-[14px]" },
};

const colorMap: Record<AvatarColor, string> = {
  slate:  "bg-[var(--color-surface-soft)]0",
  blue:   "bg-[var(--color-info)]",
  green:  "bg-[var(--color-success)]",
  red:    "bg-[var(--color-danger)]",
  yellow: "bg-yellow-400 text-[var(--color-text)]",
  purple: "bg-[var(--color-primary-soft)]0",
  teal:   "bg-[var(--color-info-soft)]0",
  orange: "bg-[var(--color-warning-soft)]0",
};

export default function Avatar({
  initials,
  color = "slate",
  size = "md",
  rounded = true,
  imageUrl,
  className = "",
}: AvatarProps) {
  const { sizeClass, textClass, radiusClass } = sizeMap[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 select-none font-bold text-[var(--color-on-primary)]",
        sizeClass,
        textClass,
        rounded ? "rounded-full" : radiusClass,
        colorMap[color],
        className
      )}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={initials}
          className={cn("w-full h-full object-cover", rounded ? "rounded-full" : radiusClass)}
        />
      ) : (
        initials
      )}
    </div>
  );
}
