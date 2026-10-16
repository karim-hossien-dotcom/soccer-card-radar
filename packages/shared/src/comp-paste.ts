/** A4: Card Ladder bulk entry — template export and paste parsing (pure). */

export type PasteCard = { id: string; cert: string | null; item: string; player: string; grade: string; extraGrades: string[] };
export type PasteLast = (cardId: string, grade: string) => { price: number; asOf: string } | null;
export type ParsedComp = { cardId: string; grade: string; price: number; sampleSize: number; asOf: string };
export type PasteResult = { rows: (ParsedComp & { line: number })[]; errors: { line: number; text: string; reason: string }[] };

export const refOf = (id: string) => id.slice(0, 8);

/** "psa10", "PSA 10", "10" -> "PSA 10"; "raw" -> "raw"; null if unrecognised. */
export function normalizeGrade(g: string): string | null {
  const t = g.trim();
  if (/^raw$/i.test(t)) return "raw";
  const m = t.match(/^(psa|bgs|sgc|cgc)?\s*(10|[1-9](\.5)?|auth)$/i);
  if (!m) return null;
  return `${(m[1] ?? "PSA").toUpperCase()} ${m[2].toUpperCase() === "AUTH" ? "AUTH" : m[2]}`;
}

const HEAD = ["ref", "card", "grade", "last price", "last date", "new price", "n"];

/** Tab-separated sheet: one row per card per grade to price; Karim fills "new price" (and optionally n). */
export function compTemplate(cards: PasteCard[], last: PasteLast): string {
  const lines = [HEAD.join("\t")];
  for (const c of cards)
    for (const g of [c.grade, ...c.extraGrades]) {
      const l = last(c.id, g);
      lines.push([refOf(c.id), `${c.player} — ${c.item}`.replace(/\s+/g, " "), g, l ? l.price.toFixed(2) : "", l?.asOf ?? "", "", ""].join("\t"));
    }
  return lines.join("\n");
}

const money = (s: string) => Number(s.replace(/[$\s,]/g, "")); // commas only survive in tab-separated input

/**
 * Tab- or comma-separated (use tabs if prices contain thousands separators).
 * Accepts the template (header row with "ref" and "new price") or headerless lines "ref, grade, price[, n][, asOf]".
 * ref = first 8+ chars of the card id, or its cert. Rows with an empty price are skipped silently.
 */
export function parseCompPaste(text: string, cards: Pick<PasteCard, "id" | "cert">[], today: string): PasteResult {
  const out: PasteResult = { rows: [], errors: [] };
  const lines = text.split(/\r?\n/);
  const split = (l: string) => (l.includes("\t") ? l.split("\t") : l.split(",")).map((x) => x.trim());
  let col = { ref: 0, grade: 1, price: 2, n: 3, asOf: 4 };
  let start = 0;
  const head = split(lines[0] ?? "").map((h) => h.toLowerCase());
  if (head.includes("ref")) {
    const at = (...names: string[]) => names.map((n) => head.indexOf(n)).find((i) => i >= 0) ?? -1;
    col = { ref: at("ref"), grade: at("grade"), price: at("new price", "price"), n: at("n"), asOf: at("as of", "asof", "date") };
    start = 1;
  }
  const byRef = (ref: string) => {
    const r = ref.toLowerCase();
    const hits = cards.filter((c) => (r.length >= 6 && c.id.toLowerCase().startsWith(r)) || (c.cert && c.cert === ref));
    return hits.length === 1 ? hits[0] : null;
  };
  for (let i = start; i < lines.length; i++) {
    const text = lines[i];
    if (!text.trim()) continue;
    const f = split(text);
    const get = (k: keyof typeof col) => (col[k] >= 0 ? f[col[k]] ?? "" : "");
    if (!get("price")) continue;
    const fail = (reason: string) => out.errors.push({ line: i + 1, text, reason });
    const card = byRef(get("ref"));
    if (!card) { fail("no card matches ref"); continue; }
    const grade = normalizeGrade(get("grade"));
    if (!grade) { fail("unknown grade"); continue; }
    const price = money(get("price"));
    if (!(price > 0 && price < 1_000_000)) { fail("bad price"); continue; }
    const n = get("n") ? Number(get("n")) : 1;
    if (!Number.isInteger(n) || n < 1) { fail("bad n"); continue; }
    const asOf = get("asOf") || today;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || asOf > today) { fail("bad date (YYYY-MM-DD, not in future)"); continue; }
    out.rows.push({ line: i + 1, cardId: card.id, grade, price, sampleSize: n, asOf });
  }
  const seen = new Map<string, number>();
  out.rows = out.rows.filter((r) => {
    const k = `${r.cardId}|${r.grade}|${r.asOf}`;
    if (seen.has(k)) { out.errors.push({ line: r.line, text: lines[r.line - 1], reason: `duplicate of line ${seen.get(k)}` }); return false; }
    seen.set(k, r.line);
    return true;
  });
  return out;
}
