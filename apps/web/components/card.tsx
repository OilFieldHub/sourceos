export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-hairline/70 bg-panel p-6 shadow-[0_1px_2px_rgba(13,43,30,0.04),0_8px_24px_-12px_rgba(13,43,30,0.10)] ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 flex items-center justify-between">{children}</div>;
}
