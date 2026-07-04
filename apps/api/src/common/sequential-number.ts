/**
 * Generates readable, per-organization sequential identifiers like
 * "PO-0001" / "GRN-0001". Count-based, with a small collision-retry loop as
 * a backstop — not perfectly race-safe under heavy concurrent writes, but
 * this is a single-Node-process V1 and these actions aren't a hot path.
 */
export async function generateSequentialNumber(
  prefix: string,
  countExisting: () => Promise<number>,
  exists: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const baseCount = await countExisting();
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `${prefix}-${String(baseCount + 1 + attempt).padStart(4, '0')}`;
    if (!(await exists(candidate))) {
      return candidate;
    }
  }
  throw new Error(`Could not generate a unique ${prefix} number`);
}
