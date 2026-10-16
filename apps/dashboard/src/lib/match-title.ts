/** C1: does an eBay title describe this target card? Terms match whole words, accents ignored; "a|b" = either. */
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const has = (title: string, term: string) => {
  const t = norm(term).trim();
  return !t || new RegExp(`(^|[^a-z0-9])${esc(t)}($|[^a-z0-9])`).test(title);
};

export function matchesTarget(title: string, mustInclude: string[], exclude: string[]): boolean {
  const t = norm(title);
  return mustInclude.every((m) => m.split("|").some((alt) => has(t, alt))) && !exclude.some((x) => has(t, x));
}
