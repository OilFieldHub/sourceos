import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "dark" | "success" | "gold" | "outline" | "outline-red";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-brand text-white shadow-[0_1px_2px_rgba(13,43,30,0.08),0_4px_10px_-4px_rgba(15,122,70,0.45)] hover:bg-brand-dark",
  dark: "bg-ink text-white shadow-[0_1px_2px_rgba(13,43,30,0.15)] hover:bg-brand-deep",
  success: "bg-success text-white shadow-[0_1px_2px_rgba(13,43,30,0.08),0_4px_10px_-4px_rgba(22,163,74,0.5)] hover:bg-success-dark",
  gold: "bg-gold text-gold-ink shadow-[0_1px_2px_rgba(13,43,30,0.08),0_4px_10px_-4px_rgba(219,165,38,0.55)] hover:bg-gold-dark",
  outline: "border border-hairline bg-panel text-ink hover:border-brand/40 hover:bg-mint/40",
  "outline-red": "border border-red-border bg-panel text-red-deep hover:bg-red-bg",
};

export function Btn({
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`rounded-full px-4 py-2 text-[13px] font-semibold tracking-tight transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${VARIANT_CLASSES[variant]} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
}
