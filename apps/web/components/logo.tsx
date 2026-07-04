export function Logo({ variant = "light", size = 28 }: { variant?: "light" | "dark"; size?: number }) {
  const color = variant === "light" ? "#0F7A46" : "#FAF8F3";
  return (
    <svg width={size} height={(size * 96) / 128} viewBox="0 0 128 96" fill="none" aria-hidden>
      <circle
        cx="48"
        cy="48"
        r="30"
        stroke={color}
        strokeWidth="16"
        pathLength={360}
        strokeDasharray="246 24 66 24"
        transform="rotate(237 48 48)"
      />
      <rect x="78" y="40" width="34" height="16" fill={color} />
      <rect x="108" y="16" width="16" height="64" fill={color} />
      <circle cx="98" cy="12" r="9" fill="#DBA526" />
    </svg>
  );
}
