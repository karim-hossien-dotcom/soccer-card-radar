/** Tier S/A/B from the research signal, lane and catalyst (used by the Snipe board). */
export function assignTier(
  signal: string,
  lane: string,
  catalyst: string,
  pageType: "rookie" | "stars" | "legends"
): "S" | "A" | "B" {
  const c = catalyst.toLowerCase();

  if (pageType === "legends") return "S";

  if (pageType === "rookie") {
    if (signal === "BUY" && lane === "rookie") {
      if (c.includes("breakout") || c.includes("wc") || c.includes("world cup")) return "S";
      return "A";
    }
    return "B";
  }

  // stars page
  if (signal === "BUY" && lane === "steal") {
    if (c.includes("wc") || c.includes("world cup")) return "S";
    return "A";
  }
  return "B";
}
