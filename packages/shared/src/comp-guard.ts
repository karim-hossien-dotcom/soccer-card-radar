/**
 * comp-guard (PC1): the card-comps sale check and verifier rules as code. Every proposed CardComp is run through
 * this before insert; `ok: false` means it is not written. Pure functions, no I/O; `now` is a parameter.
 */

export interface GuardCard {
  item?: string | null;
  year?: string | number | null;
  set?: string | null;
  number?: string | null;
  parallel?: string | null;
  printRun?: number | null;
  isAuto?: boolean | null;
  grader?: string | null;
  grade?: string | null;
  status?: string | null;
}

export interface GuardProposed {
  grade: string;
  price: number;
  low?: number | null;
  high?: number | null;
  sampleSize: number;
  source: string;
  method: string;
  confidence?: number | null;
}

export interface GuardSale {
  date: string;
  price: number;
  title: string;
  source: string;
  url?: string | null;
  seller?: string | null;
  kept: boolean;
  rejectReason?: string | null;
}

export interface GuardLedger {
  date: string;
  amount: number;
  kind: string;
}

export interface CompGuardInput {
  now: string | Date;
  card: GuardCard;
  proposed: GuardProposed;
  sales: GuardSale[];
  ledger?: GuardLedger[];
  ownSellerIds?: string[];
}

export type GuardCode =
  | "input"
  | "grade_label"
  | "source_forbidden"
  | "no_evidence"
  | "n_mismatch"
  | "not_median"
  | "sale_age"
  | "parallel_word"
  | "auto_mismatch"
  | "grade_mismatch"
  | "lot"
  | "own_sale"
  | "thin"
  | "reject_reason_missing"
  | "reject_reason_on_kept";

export interface GuardIssue {
  code: GuardCode | string;
  sale?: number; // index into input.sales
  message: string;
}

export interface CompGuardResult {
  ok: boolean;
  errors: GuardIssue[];
  warnings: GuardIssue[];
}

/** Same pattern as the CardComp_grade_check constraint (migration 20261112c_comp_grade_check.sql). */
export const GRADE_LABEL_RE = /^(raw|(PSA|BGS|SGC|CGC) [0-9]{1,2}(\.[0-9])?)$/;
/** Sources that are not a median of market sales: they may have zero kept sales. */
export const NO_SALES_SOURCES = ["estimate", "owner_set", "ratio_to_base"];
export const FORBIDDEN_SOURCES = ["workbook_import"];
export const MARKET_DAYS = 90;
export const ESTIMATE_MAX_DAYS = 730; // 24 months
export const OWN_PRICE_TOL = 0.01; // ±1%
const DAY_MS = 86_400_000;

/** Parallel / colour words (card-comps sale check 2). Multi-word phrases are matched as phrases, longest first. */
export const PARALLEL_WORDS = [
  "silver", "gold", "rose gold", "purple", "blue", "red", "green", "orange", "pink", "black", "white", "yellow",
  "teal", "aqua", "bronze", "platinum", "sapphire", "emerald", "ruby", "mojo", "tie dye", "zebra", "shimmer",
  "wave", "red wave", "blue wave", "lava", "multi color", "refractor", "x fractor", "xfractor", "superfractor",
  "prizm", "holo", "atomic", "speckle", "camo", "cracked ice", "disco", "hyper", "neon", "pulsar", "scope",
  "snakeskin", "velocity", "choice", "nebula", "galactic", "printing plate", "fotl", "geometric", "sparkle",
  // review(PC1): more parallel names seen on soccer checklists
  "vinyl", "copper", "lime", "magenta", "fuchsia", "sepia", "negative", "ice", "laser", "lazer", "logofractor",
  "glitter", "rainbow", "foil",
];
/**
 * review(PC1): phrases that hold a colour word but are not a parallel: club / national-team nicknames and grader
 * labels (BGS Black Label, SGC Gold Label). Removed from the title before the parallel check.
 */
export const NOT_PARALLEL_PHRASES = [
  "red bull", "red bulls", "red star", "red devils", "black stars", "black cats", "yellow submarine", "blue samurai",
  "black label", "gold label",
];
/** Spellings folded to one form before matching (title and card alike). */
const CANON: [RegExp, string][] = [
  [/\brefractors\b/g, "refractor"],
  [/\bprizms\b/g, "prizm"],
  [/\bmulti ?colou?r\b/g, "multi color"],
  [/\btie ?dye\b/g, "tie dye"],
  [/\bcolour\b/g, "color"],
];
const AUTO_WORDS = ["auto", "autos", "autograph", "autographs", "autographed", "signed", "signature", "signatures", "au", "rpa"];
// "rpa" = rookie patch auto: a patch auto, so it counts as a memorabilia word too (review(PC1)).
const MEM_WORDS = ["patch", "patches", "relic", "relics", "jersey", "jsy", "memorabilia", "rpa"];
const GRADERS = ["PSA", "BGS", "SGC", "CGC", "BECKETT", "TAG", "HGA", "GMA", "ISA", "CSG", "VGC", "KSA", "AGS"];

const norm = (s: unknown): string =>
  (typeof s === "string" || typeof s === "number" ? String(s) : "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const canon = (s: string): string => CANON.reduce((t, [re, to]) => t.replace(re, to), s);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const hasWord = (text: string, word: string) => new RegExp(`(^|[^a-z0-9])${esc(word)}([^a-z0-9]|$)`).test(text);
const toTime = (d: unknown): number => {
  if (d instanceof Date) return d.getTime();
  if (typeof d === "string" || typeof d === "number") return new Date(d).getTime();
  return NaN;
};
const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const k = s.length >> 1;
  return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2;
}

interface SerialHit {
  num: string | null;
  den: number;
  hash: boolean; // written "#24/25": always a serial
}

function serialHits(title: string): SerialHit[] {
  const out: SerialHit[] = [];
  const re = /(#\s*)?(\d{1,4})?\s*\/\s*(\d{1,4})(?!\d)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(title))) {
    const a = m[2];
    const b = m[3];
    if (a && /^(19|20)\d{2}$/.test(a) && (b.length === 2 || (b.length === 4 && Number(b) === Number(a) + 1))) continue; // 2024/25, 2024/2025
    out.push({ num: a ?? null, den: Number(b), hash: !!m[1] });
  }
  // review(PC1): "1 of 1", "07 of 10", "numbered to 25", "#'d to 99"
  const of = /(?:^|[^\w])(\d{1,4}) of (\d{1,4})(?!\d)/gi;
  while ((m = of.exec(title))) if (!/^(19|20)\d{2}$/.test(m[2])) out.push({ num: m[1], den: Number(m[2]), hash: false });
  const to = /(?:numbered|#'?d|serial(?:ly)? numbered)\s*(?:to|\/)\s*(\d{1,4})(?!\d)/gi;
  while ((m = to.exec(title))) out.push({ num: null, den: Number(m[1]), hash: false });
  return out;
}

/**
 * Denominators of serials in a title ("/50", "09/10", "#/99", "1 of 1", "numbered to 25"). A four-digit season
 * ("2024/25", "2024/2025") is not a serial; a two-digit one ("24/25") is treated as a serial (ambiguous -> reject)
 * unless compGuard finds it is the card's own season.
 */
export function serialsIn(title: string): number[] {
  return serialHits(title).map((h) => h.den);
}

/** Two-digit season pairs ("24/25") that can be this card's season: year "2024-25", "2025" or "2024". */
function cardSeasons(year: unknown): Set<string> {
  const out = new Set<string>();
  const ys = (String(year ?? "").match(/(19|20)\d{2}/g) ?? []).map(Number);
  const two = String(year ?? "").match(/(19|20)(\d{2})\s*[-/]\s*(\d{2})(?!\d)/);
  if (two) out.add(`${two[2]}/${two[3]}`);
  for (const y of ys) {
    const p = (n: number) => String(((n % 100) + 100) % 100).padStart(2, "0");
    out.add(`${p(y - 1)}/${p(y)}`);
    out.add(`${p(y)}/${p(y + 1)}`);
  }
  return out;
}

/** Parallel phrases in a text, longest first; a matched phrase is consumed so its words are not counted again. */
function parallelPhrases(text: string): Set<string> {
  const found = new Set<string>();
  let t = ` ${text} `;
  for (const p of [...PARALLEL_WORDS].sort((a, b) => b.split(" ").length - a.split(" ").length || b.length - a.length)) {
    const re = new RegExp(`(^|[^a-z0-9])${esc(p)}(?=[^a-z0-9]|$)`, "g");
    if (re.test(t)) {
      found.add(p);
      t = t.replace(re, "$1 ");
    }
  }
  return found;
}

/** Graders and grades shown in a title: [{grader, grade|null}]. Also flags Authentic/Altered. */
function gradesIn(title: string): { grader: string; grade: number | null }[] {
  const out: { grader: string; grade: number | null }[] = [];
  const re = new RegExp(
    `(^|[^A-Za-z0-9])(${GRADERS.join("|")})(?![A-Za-z])\\s*(?:(?:gem\\s*(?:mint|mt)|mint|mt|nm\\s*mt|pristine|black\\s*label)\\s*)?(\\d{1,2}(?:\\.\\d)?)?(?![\\d.])`,
    "gi",
  );
  let m: RegExpExecArray | null;
  while ((m = re.exec(title))) out.push({ grader: m[2].toUpperCase().replace("BECKETT", "BGS"), grade: m[3] ? Number(m[3]) : null });
  return out;
}

const AUTHENTIC_RE = /(^|[^a-z])(authentic|auth|altered)([^a-z]|$)/i;
/** review(PC1): PSA qualifier grades ("PSA 9 OC", "PSA 8 (ST)") are not the straight grade. Upper case only. */
const QUALIFIER_RE = /(^|[^A-Za-z0-9])(PSA|SGC|BGS|CGC)\s*\d{1,2}(?:\.\d)?\s*\(?(OC|ST|PD|OF|MK|MC)\)?(?![A-Za-z])/;

export function compGuard(input: CompGuardInput): CompGuardResult {
  const errors: GuardIssue[] = [];
  const warnings: GuardIssue[] = [];
  const done = () => ({ ok: errors.length === 0, errors, warnings });

  if (!input || typeof input !== "object") {
    errors.push({ code: "input", message: "no input" });
    return done();
  }
  const now = toTime(input.now);
  const { card, proposed } = input;
  if (!Number.isFinite(now)) errors.push({ code: "input", message: "now missing or not a date" });
  if (!card || typeof card !== "object") errors.push({ code: "input", message: "card missing" });
  if (!proposed || typeof proposed !== "object") errors.push({ code: "input", message: "proposed missing" });
  if (!Array.isArray(input.sales)) errors.push({ code: "input", message: "sales must be an array" });
  if (errors.length) return done();
  if (!isNum(proposed.price) || proposed.price <= 0) errors.push({ code: "input", message: "proposed.price must be a positive number" });

  const sales = input.sales;
  const ledger = Array.isArray(input.ledger) ? input.ledger : [];
  const ownIds = (Array.isArray(input.ownSellerIds) ? input.ownSellerIds : []).map((s) => norm(s)).filter(Boolean);
  const source = String(proposed.source ?? "");
  const isEstimate = source === "estimate";
  const noSalesOk = NO_SALES_SOURCES.includes(source);
  const grade = typeof proposed.grade === "string" ? proposed.grade : "";

  // Proposal-level checks.
  if (!GRADE_LABEL_RE.test(grade)) {
    errors.push({ code: "grade_label", message: `grade "${grade}" is not raw or PSA/BGS/SGC/CGC + number` });
  }
  if (FORBIDDEN_SOURCES.includes(source)) {
    errors.push({ code: "source_forbidden", message: `source ${source} is never a new comp` });
  }

  // Kept / rejected bookkeeping.
  const kept: { i: number; s: GuardSale }[] = [];
  sales.forEach((s, i) => {
    if (!s || typeof s !== "object") {
      errors.push({ code: "input", sale: i, message: "sale is not an object" });
      return;
    }
    const reason = typeof s.rejectReason === "string" ? s.rejectReason.trim() : "";
    if (s.kept === true) {
      if (reason) errors.push({ code: "reject_reason_on_kept", sale: i, message: "kept sale carries a rejectReason" });
      kept.push({ i, s });
    } else if (!reason) {
      errors.push({ code: "reject_reason_missing", sale: i, message: "rejected sale has no rejectReason" });
    }
  });

  if (!noSalesOk && kept.length === 0) {
    errors.push({ code: "no_evidence", message: `source ${source || "(none)"} needs kept sales; none given` });
  }
  if (!noSalesOk && proposed.sampleSize !== kept.length) {
    errors.push({ code: "n_mismatch", message: `sampleSize ${proposed.sampleSize} but ${kept.length} kept sales` });
  }
  // "single" is the median of one sale (review(PC1)).
  if ((proposed.method === "median" || proposed.method === "single") && kept.length) {
    const prices = kept.map((k) => k.s.price).filter(isNum);
    if (prices.length === kept.length) {
      const med = median(prices);
      if (!isNum(proposed.price) || Math.abs(proposed.price - med) > 0.01 + 1e-9) {
        errors.push({ code: "not_median", message: `price ${proposed.price} is not the median of kept sales (${med})` });
      }
    }
  }
  const noRange = proposed.low === null || proposed.low === undefined || proposed.high === null || proposed.high === undefined;
  if (proposed.sampleSize === 1 && noRange && isNum(proposed.confidence) && proposed.confidence > 2) {
    errors.push({ code: "thin", message: `one sale with no low/high cannot be confidence ${proposed.confidence}` });
  }

  // Per kept sale.
  const cardText = canon(norm([card.item, card.set, card.parallel].filter(Boolean).join(" ")));
  const cardPhrases = parallelPhrases(cardText);
  const ownParallel = parallelPhrases(canon(norm(card.parallel)));
  const seasons = cardSeasons(card.year);
  const cardHasMem = MEM_WORDS.some((w) => hasWord(cardText, w));
  const parallelText = norm(card.parallel);
  const isBase = !parallelText || parallelText === "base";
  const printRun = isNum(card.printRun) && card.printRun > 0 ? card.printRun : null;
  const gradeMatch = /^(PSA|BGS|SGC|CGC) ([0-9.]+)$/.exec(grade);
  const ageLimit = isEstimate ? ESTIMATE_MAX_DAYS : MARKET_DAYS;
  let newestKeptAge = Infinity;

  for (const { i, s } of kept) {
    const title = typeof s.title === "string" ? s.title : "";
    // Team names and grader labels that carry a colour word are not parallels.
    const t = NOT_PARALLEL_PHRASES.reduce(
      (x, p) => x.replace(new RegExp(`(^|[^a-z0-9])${esc(p)}(?=[^a-z0-9]|$)`, "g"), "$1 "),
      canon(norm(title)),
    );
    if (!isNum(s.price) || s.price <= 0) errors.push({ code: "input", sale: i, message: "kept sale price must be a positive number" });
    if (!title) errors.push({ code: "input", sale: i, message: "kept sale has no title" });
    if (!s.url) warnings.push({ code: "no_url", sale: i, message: "kept sale has no url" });

    // sale_age
    const ts = toTime(s.date);
    if (!Number.isFinite(ts)) {
      errors.push({ code: "input", sale: i, message: "kept sale date is not a date" });
    } else if (Number.isFinite(now)) {
      const age = (now - ts) / DAY_MS;
      if (age < -1) errors.push({ code: "input", sale: i, message: "kept sale date is in the future" });
      newestKeptAge = Math.min(newestKeptAge, age);
      if (age > ageLimit) {
        errors.push({
          code: "sale_age",
          sale: i,
          message: `kept sale is ${Math.floor(age)} days old (limit ${ageLimit} for source ${source || "(none)"})`,
        });
      }
    }

    // parallel_word (phrases in the card's own item/set/parallel are allowed; "Gold" is not "Rose Gold")
    const titlePhrases = parallelPhrases(t);
    const words = [...titlePhrases].filter((p) => !cardPhrases.has(p));
    if (words.length) {
      errors.push({
        code: "parallel_word",
        sale: i,
        message: `title has ${words.join(", ")} (card parallel: ${isBase ? "base" : card.parallel})`,
      });
    }
    const hits = serialHits(title).filter((h) => h.den !== printRun);
    // "24/25" as the card's own season is the season, not a serial (a "#24/25" stays a serial).
    const serials = hits.filter((h) => h.hash || !h.num || h.num.length !== 2 || !seasons.has(`${h.num}/${String(h.den).padStart(2, "0")}`));
    if (serials.length) {
      errors.push({
        code: "parallel_word",
        sale: i,
        message: `title has serial /${serials.map((h) => h.den).join(", /")} (card print run: ${printRun ? `/${printRun}` : "none"})`,
      });
    }
    // A parallel card's sale with neither its parallel name nor its print run in the title: the photo must show it.
    if (!isBase && !words.length && ![...ownParallel].some((p) => titlePhrases.has(p)) && !(printRun && serialsIn(title).includes(printRun))) {
      warnings.push({ code: "parallel_unconfirmed", sale: i, message: `title shows neither ${card.parallel} nor its print run: check the photo` });
    }

    // auto_mismatch
    const autoInTitle = AUTO_WORDS.filter((w) => hasWord(t, w) && !hasWord(cardText, w));
    const memInTitle = MEM_WORDS.filter((w) => hasWord(t, w) && !hasWord(cardText, w));
    if (card.isAuto) {
      if (!AUTO_WORDS.some((w) => hasWord(t, w))) {
        errors.push({ code: "auto_mismatch", sale: i, message: "card is an auto; title has no auto word" });
      } else if (!cardHasMem && memInTitle.length) {
        errors.push({ code: "auto_mismatch", sale: i, message: `card is an on-card auto; title has ${memInTitle.join(", ")}` });
      } else if (cardHasMem && !MEM_WORDS.some((w) => hasWord(t, w))) {
        errors.push({ code: "auto_mismatch", sale: i, message: "card is a patch auto; title has no patch/relic word" });
      }
    } else if (autoInTitle.length || memInTitle.length) {
      errors.push({ code: "auto_mismatch", sale: i, message: `card is not an auto; title has ${[...new Set([...autoInTitle, ...memInTitle])].join(", ")}` });
    }

    // grade_mismatch
    const shown = gradesIn(title);
    const authentic = AUTHENTIC_RE.test(title) && shown.length > 0;
    if (grade === "raw") {
      if (shown.length) errors.push({ code: "grade_mismatch", sale: i, message: `raw card; title shows ${shown.map((g) => g.grader + (g.grade ?? "")).join(", ")}` });
    } else if (gradeMatch) {
      const [, wantGrader, wantGradeStr] = gradeMatch;
      const wantGrade = Number(wantGradeStr);
      const other = shown.filter((g) => g.grader !== wantGrader || (g.grade !== null && g.grade !== wantGrade));
      const exact = shown.some((g) => g.grader === wantGrader && g.grade === wantGrade);
      const qualifier = QUALIFIER_RE.exec(title);
      if (other.length || authentic || qualifier) {
        const what = other.map((g) => `${g.grader} ${g.grade ?? ""}`.trim());
        if (authentic) what.push("Authentic/Altered");
        if (qualifier) what.push(`qualifier ${qualifier[3]}`);
        errors.push({ code: "grade_mismatch", sale: i, message: `proposed ${grade}; title shows ${what.join(", ")}` });
      } else if (!exact) {
        errors.push({ code: "grade_mismatch", sale: i, message: `proposed ${grade}; title shows no grade` });
      }
    }

    // lot
    if (/(^|[^a-z0-9])(lot|lots|bundle)([^a-z0-9]|$)|(^|[^a-z0-9])x ?[2-9]([^0-9]|$)|(^|[^a-z0-9])[2-9]x([^a-z0-9]|$)|set of/.test(t)) {
      errors.push({ code: "lot", sale: i, message: "title looks like a lot / multiple cards" });
    }

    // own_sale
    if (s.seller && ownIds.includes(norm(s.seller))) {
      errors.push({ code: "own_sale", sale: i, message: "seller is Karim's own account" });
    } else if (Number.isFinite(ts) && isNum(s.price)) {
      const hit = ledger.find((l) => {
        if (!l || (l.kind !== "purchase" && l.kind !== "sale") || !isNum(l.amount)) return false;
        const lt = toTime(l.date);
        if (!Number.isFinite(lt)) return false;
        // Same date: UTC calendar days may differ by one across time zones (ledger dates are date-only).
        const sameDate = Math.abs(Math.floor(lt / DAY_MS) - Math.floor(ts / DAY_MS)) <= 1;
        const amt = Math.abs(l.amount);
        return sameDate && Math.abs(s.price - amt) <= OWN_PRICE_TOL * amt;
      });
      if (hit) errors.push({ code: "own_sale", sale: i, message: `same date and price as a ledger ${hit.kind}` });
    }
  }

  if (isEstimate && kept.length && newestKeptAge > 365) {
    warnings.push({ code: "no_market_12m", message: "newest kept sale is older than 12 months: confidence 1, report 'no market in 12 months'" });
  }
  if (!ownIds.length && !ledger.length && kept.length) {
    warnings.push({ code: "own_check_empty", message: "no ownSellerIds and no ledger: own-sale check had nothing to compare" });
  }
  return done();
}

/** For the CLI: JSON with ISO dates. `now` is required (no clock default: the rules depend on it). */
export function compGuardFromJson(json: unknown): CompGuardResult {
  return compGuard(json as CompGuardInput);
}
