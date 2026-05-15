import type { ReactElement } from "react";

type IconName =
  | "home"
  | "users"
  | "calendar"
  | "message"
  | "clipboard"
  | "pill"
  | "flask"
  | "settings"
  | "chart"
  | "bell"
  | "shield"
  | "receipt"
  | "activity"
  | "check"
  | "clock"
  | "bolt"
  | "medical"
  | "search"
  | "help"
  | "plus"
  | "trash"
  | "close";

type IconProps = {
  name: IconName;
  className?: string;
  size?: number;
  strokeWidth?: number;
};

const icons: Record<IconName, ReactElement> = {
  home: (
    <>
      <path d="M3 11.5l9-7 9 7" />
      <path d="M5 10.5V20h14v-9.5" />
    </>
  ),
  users: (
    <>
      <path d="M16 11a4 4 0 1 0-8 0" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 9h18" />
    </>
  ),
  message: (
    <>
      <path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z" />
    </>
  ),
  clipboard: (
    <>
      <rect x="9" y="2" width="6" height="4" rx="1" />
      <path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" />
    </>
  ),
  pill: (
    <>
      <path d="M7 4h10a5 5 0 0 1 0 10H7A5 5 0 0 1 7 4z" />
      <path d="M12 4v10" />
    </>
  ),
  flask: (
    <>
      <path d="M10 2v6l-5 9a3 3 0 0 0 2.6 4.5h8.8a3 3 0 0 0 2.6-4.5l-5-9V2" />
      <path d="M8 2h8" />
    </>
  ),
  settings: (
    <>
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" />
      <circle cx="15" cy="12" r="2" />
      <circle cx="11" cy="18" r="2" />
    </>
  ),
  chart: (
    <>
      <path d="M3 3v18h18" />
      <path d="M7 14l4-4 4 3 5-6" />
    </>
  ),
  bell: (
    <>
      <path d="M6 8a6 6 0 1 1 12 0v5l2 2H4l2-2z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z" />
    </>
  ),
  receipt: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </>
  ),
  activity: (
    <>
      <path d="M3 12h4l2-4 4 8 2-4h6" />
    </>
  ),
  check: (
    <>
      <path d="M5 12l4 4L19 6" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  bolt: (
    <>
      <path d="M13 2L3 14h7l-1 8 10-12h-7z" />
    </>
  ),
  medical: (
    <>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M9 3h6v2H9z" />
      <path d="M12 9v6M9 12h6" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-3.5-3.5" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.6 2.2c-.9.4-1.6 1.2-1.6 2.3" />
      <circle cx="12" cy="17" r="0.8" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14M5 12h14" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
    </>
  ),
  close: (
    <>
      <path d="M18 6L6 18M6 6l12 12" />
    </>
  ),
};

export default function Icon({
  name,
  className,
  size = 20,
  strokeWidth = 1.8,
}: IconProps) {
  return (
    <svg
      role="img"
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {icons[name]}
    </svg>
  );
}

export type { IconName };
