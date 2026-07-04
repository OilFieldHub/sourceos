import type { InputHTMLAttributes } from "react";

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-hairline bg-panel px-3.5 py-2.5 text-[13.5px] text-ink outline-none transition placeholder:text-muted/50 focus:border-brand focus:ring-4 focus:ring-mint ${className}`}
      {...props}
    />
  );
}

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[13px] font-semibold text-ink">{children}</label>;
}
