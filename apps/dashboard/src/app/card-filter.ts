/**
 * Strict card quality filter — shared across ALL pages.
 * A card must pass this to be shown anywhere in the dashboard.
 *
 * KEEP:
 *   - Numbered /99 or less (regex /\/(\d{1,2})\b/ where number is 1-99)
 *   - On-card autographs (NOT sticker autos)
 *   - Graded cards (PSA, BGS, SGC, CGC)
 *   - SSP, case hit, 1/1
 *
 * REJECT:
 *   - Leaf products
 *   - Hobby boxes, sealed product, blasters, mega boxes, packs
 *   - Lots, bundles, singles/pick-your
 *   - Stickers, albums, jerseys, shirts, figurines
 *   - Base cards (unless also has "auto")
 *   - Sticker autos
 *   - Digital cards (Topps Bunt)
 *   - Numbered /100+
 */
export function isQualityCard(title: string): boolean {
  const t = title.toLowerCase();

  // === HARD REJECT (never show) ===
  if (t.includes("leaf")) return false;
  if (
    t.includes("hobby box") ||
    t.includes("sealed") ||
    t.includes("blaster") ||
    t.includes("mega box") ||
    t.includes("pack")
  )
    return false;
  if (
    t.includes(" lot ") ||
    t.startsWith("lot ") ||
    t.includes("lot of") ||
    t.includes("count lot")
  )
    return false;
  if (t.includes("sticker") || t.includes("album")) return false;
  if (t.includes("jersey") || t.includes("shirt") || t.includes("figurine"))
    return false;
  if (t.includes("base") && !t.includes("auto")) return false;
  if (
    t.includes("singles") ||
    t.includes("pick-your") ||
    t.includes("pick your") ||
    t.includes("you pick") ||
    t.includes("choose your")
  )
    return false;
  if (t.includes("digital") || t.includes("topps bunt")) return false;
  if (t.includes("sticker auto")) return false;

  // Non-accredited / unlicensed products
  if (t.includes("wild card") || t.includes("futera") || t.includes("cards alive")) return false;
  if (t.includes("custom") || t.includes("reprint") || t.includes("novelty")) return false;
  if (t.includes("not a real card") || t.includes("unofficial")) return false;
  if (t.includes("acb") && !t.includes("topps") && !t.includes("panini")) return false;

  // === MUST HAVE at least one value marker ===

  // Numbered /99 or less — strict /XX pattern at word boundary
  const slashMatch = t.match(/\/(\d{1,2})\b/);
  const hasSmallNumber =
    slashMatch !== null &&
    parseInt(slashMatch[1]) >= 1 &&
    parseInt(slashMatch[1]) <= 99;

  // On-card auto (not sticker auto — already rejected above)
  const isAuto =
    (t.includes("auto") ||
      t.includes("autograph") ||
      t.includes("signature")) &&
    !t.includes("sticker auto");

  // Graded
  const isGraded =
    t.includes("psa") ||
    t.includes("bgs") ||
    t.includes("sgc") ||
    t.includes("cgc");

  // SSP / case hit / 1/1
  const isSSP = t.includes("ssp") || t.includes("case hit") || t.includes("1/1");

  return hasSmallNumber || isAuto || isGraded || isSSP;
}

/**
 * Exception for pre-2015 legend base cards that can hold value.
 * Returns true if the title contains a legend name AND a year before 2015.
 */
export function isVintageLegend(title: string): boolean {
  const t = title.toLowerCase();

  const legendNames = ["messi", "ronaldo", "maradona", "pele", "zidane"];
  const hasLegend = legendNames.some((name) => t.includes(name));
  if (!hasLegend) return false;

  // Match 19XX, 200X, or 201[0-4]
  const yearMatch = t.match(/\b(19\d{2}|200\d|201[0-4])\b/);
  return yearMatch !== null;
}
