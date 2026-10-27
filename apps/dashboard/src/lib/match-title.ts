/** C1: does an eBay title describe this target card? Terms match whole words, accents ignored; "a|b" = either. */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (title: string, term: string) => {
  const t = norm(term).trim();
  return !t || new RegExp(`(^|[^a-z0-9])${esc(t)}($|[^a-z0-9])`).test(title);
};

/** Exclude term "numbered" = any print-run serial in the title (66/99, #/25, /10): base and unnumbered parallels never have one. */
const NUMBERED = /(^|[^a-z0-9])(\d{1,4}|#)?\s*\/\s*\d{1,4}($|[^a-z0-9])/;
const excluded = (t: string, x: string) => (norm(x).trim() === "numbered" ? NUMBERED.test(t.replace(/\b(19|20)\d\d\s*\/\s*\d{2,4}\b/g, "")) : has(t, x));

export function matchesTarget(title: string, mustInclude: string[], exclude: string[]): boolean {
  const t = norm(title);
  return mustInclude.every((m) => m.split("|").some((alt) => has(t, alt))) && !exclude.some((x) => excluded(t, x));
}
