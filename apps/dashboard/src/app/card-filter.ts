/**
 * Strict card quality filter — shared across ALL pages.
 * A card must pass this to be shown anywhere in the dashboard.
 *
 * KEEP:
 *   - Numbered /99 or less (verified by regex, NOT in title text like "50 card")
 *   - On-card autographs (not sticker autos)
 *   - Graded cards (PSA, BGS, SGC, CGC)
 *   - SSP, case hit, 1/1
 *
 * REJECT:
 *   - Base cards (even if "refractor" — unnumbered refractors are common)
 *   - Hobby boxes, sealed product, packs
 *   - Lots, bundles
 *   - Stickers, albums, jerseys, non-card items
 *   - Leaf products
 *   - Numbered /100+ (e.g. /150, /199, /250, /275, /399)
 *   - "Singles" listings (pick your card type posts)
 */
export function isQualityCard(title: string): boolean {
  const t = title.toLowerCase();

  // === HARD REJECT (never show) ===
  if (t.includes("leaf")) return false;
  if (t.includes("hobby box") || t.includes("sealed") || t.includes("blaster") || t.includes("mega box") || t.includes("fat pack") || t.includes("hanger") || t.includes("pack box")) return false;
  if (t.includes(" lot ") || t.startsWith("lot ") || t.includes("lot of") || t.includes("count lot")) return false;
  if (t.includes("sticker") || t.includes("album") || t.includes("magazine") || t.includes("poster")) return false;
  if (t.includes("jersey") || t.includes("shirt") || t.includes("figurine") || t.includes("funko")) return false;
  if (t.includes("base") && !t.includes("auto")) return false;
  if (t.includes("singles") || t.includes("pick your") || t.includes("you pick") || t.includes("choose your")) return false;
  if (t.includes("digital") || t.includes("topps bunt") || t.includes("panini dunk")) return false;

  // === MUST HAVE at least one value marker ===

  // Numbered /99 or less — careful regex to avoid "50 card" or "2025-26"
  const numMatch = t.match(/\b(\d{1,3})\/(\d{1,3})\b/) || t.match(/#?\/?(\d{1,3})\b.*?\/(\d{1,3})\b/);
  let hasSmallNumber = false;
  if (numMatch) {
    const denom = parseInt(numMatch[2] ?? numMatch[1]);
    if (denom <= 99 && denom >= 1) hasSmallNumber = true;
  }
  // Also check /XX format at word boundary
  const slashMatch = t.match(/\/(\d{1,2})\b/);
  if (slashMatch && parseInt(slashMatch[1]) <= 99 && parseInt(slashMatch[1]) >= 1) hasSmallNumber = true;

  // On-card auto (not sticker auto)
  const isAuto = (t.includes("auto") || t.includes("autograph") || t.includes("signature")) && !t.includes("sticker auto");

  // Graded
  const isGraded = t.includes("psa") || t.includes("bgs") || t.includes("sgc") || t.includes("cgc");

  // SSP / case hit / 1/1
  const isSSP = t.includes("ssp") || t.includes("case hit") || t.includes("1/1");

  return hasSmallNumber || isAuto || isGraded || isSSP;
}
