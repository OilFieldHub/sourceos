/**
 * No entity has a real `slug` column — SEO route params are matched against
 * a slug derived from the display name at read time instead. Fine at V1
 * scale (a handful of suppliers); a name collision would need a real unique
 * `slug` column with a disambiguation suffix, which isn't built here.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
