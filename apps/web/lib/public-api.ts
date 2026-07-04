const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

/** Server-side only — no token, no client bundle. Powers the SSR SEO pages. */
export async function publicApiGet<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Public API error ${res.status} on ${path}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T | null;
}
