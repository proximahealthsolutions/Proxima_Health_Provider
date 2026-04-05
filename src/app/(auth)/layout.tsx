import ThemeToggle from "@/components/shared/ThemeToggle";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--color-surface)] min-h-screen relative">
      <ThemeToggle className="absolute top-4 right-4 z-20" />
      {children}
    </div>
  );
}
