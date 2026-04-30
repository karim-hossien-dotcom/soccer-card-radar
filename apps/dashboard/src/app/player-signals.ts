// Unified player signal data — shared across ALL tabs
// Every listing everywhere gets tagged with this context

export type Signal = "BUY" | "SELL" | "HOLD" | "WATCH";

export interface PlayerSignal {
  player: string;
  signal: Signal;
  confidence: "high" | "medium" | "low";
  priceTarget: { floor: number; mid: number; ceiling: number } | null;
  timeframe: string;
  catalyst: string;
  worldCup2026: boolean;
  stage: "rising" | "peak" | "legacy";
  photo: string;
  age: number;
  club: string;
}

// Research-backed signals for quick decisions
export const playerSignals: Record<string, PlayerSignal> = {
  "Santiago Castro": {
    player: "Santiago Castro", signal: "BUY", confidence: "high",
    priceTarget: { floor: 8, mid: 60, ceiling: 100 },
    timeframe: "By June 11 (WC)", catalyst: "Argentina WC squad. PSA 10 autos at $20 = 3-5x.",
    worldCup2026: true, stage: "rising", age: 20, club: "Bologna",
    photo: "https://img.a.transfermarkt.technology/portrait/header/939498-1694590849.jpg",
  },
  "Geovany Quenda": {
    player: "Geovany Quenda", signal: "BUY", confidence: "high",
    priceTarget: { floor: 8, mid: 100, ceiling: 200 },
    timeframe: "Before summer transfer", catalyst: "Big club transfer rumored. Auto PSA 10 at $20.",
    worldCup2026: false, stage: "rising", age: 17, club: "Sporting CP",
    photo: "https://img.a.transfermarkt.technology/portrait/header/1096058-1727089927.jpg",
  },
  "Lennart Karl": {
    player: "Lennart Karl", signal: "BUY", confidence: "high",
    priceTarget: { floor: 50, mid: 500, ceiling: 5000 },
    timeframe: "Before WC (June 11)", catalyst: "Broke Mbappe UCL record. Pre-breakout pricing.",
    worldCup2026: true, stage: "rising", age: 17, club: "Bayern Munich",
    photo: "https://img.a.transfermarkt.technology/portrait/header/1062628-1726643498.jpg",
  },
  "Nico Paz": {
    player: "Nico Paz", signal: "BUY", confidence: "high",
    priceTarget: { floor: 30, mid: 200, ceiling: 500 },
    timeframe: "Before Argentina squad", catalyst: "12G 6A in Serie A. Real Madrid buy-back.",
    worldCup2026: true, stage: "rising", age: 20, club: "Como",
    photo: "https://img.a.transfermarkt.technology/portrait/header/948294-1724316705.jpg",
  },
  "Ethan Nwaneri": {
    player: "Ethan Nwaneri", signal: "BUY", confidence: "medium",
    priceTarget: { floor: 10, mid: 80, ceiling: 200 },
    timeframe: "Before WC squad", catalyst: "Arsenal + England U21. Cards undervalued.",
    worldCup2026: true, stage: "rising", age: 17, club: "Arsenal",
    photo: "https://img.a.transfermarkt.technology/portrait/header/946498-1727089927.jpg",
  },
  "Kobbie Mainoo": {
    player: "Kobbie Mainoo", signal: "BUY", confidence: "high",
    priceTarget: { floor: 15, mid: 100, ceiling: 300 },
    timeframe: "Before May squad announcements", catalyst: "Cards dipped 30-40%. England WC locked.",
    worldCup2026: true, stage: "rising", age: 20, club: "Manchester United",
    photo: "https://img.a.transfermarkt.technology/portrait/header/820374-1727089927.jpg",
  },
  "Eli Junior Kroupi": {
    player: "Eli Junior Kroupi", signal: "BUY", confidence: "low",
    priceTarget: { floor: 3, mid: 30, ceiling: 100 },
    timeframe: "Long-term hold", catalyst: "17yo in PL. Speculative but ultra cheap.",
    worldCup2026: false, stage: "rising", age: 17, club: "Bournemouth",
    photo: "https://img.a.transfermarkt.technology/portrait/header/1091498-1725354600.jpg",
  },
  "Senny Mayulu": {
    player: "Senny Mayulu", signal: "BUY", confidence: "medium",
    priceTarget: { floor: 5, mid: 50, ceiling: 150 },
    timeframe: "6-12 months", catalyst: "PSG academy gem. France U21.",
    worldCup2026: false, stage: "rising", age: 18, club: "PSG",
    photo: "https://img.a.transfermarkt.technology/portrait/header/934969-1727089927.jpg",
  },
  "Shea Lacey": {
    player: "Shea Lacey", signal: "BUY", confidence: "medium",
    priceTarget: { floor: 20, mid: 100, ceiling: 300 },
    timeframe: "6-12 months", catalyst: "Man Utd integration under Amorim.",
    worldCup2026: false, stage: "rising", age: 18, club: "Manchester United",
    photo: "https://img.a.transfermarkt.technology/portrait/header/926309-1727938734.jpg",
  },
  "Claudio Echeverri": {
    player: "Claudio Echeverri", signal: "BUY", confidence: "low",
    priceTarget: { floor: 3, mid: 20, ceiling: 80 },
    timeframe: "12+ months", catalyst: "Man City return or WC call = spike. Floor price now.",
    worldCup2026: true, stage: "rising", age: 19, club: "Girona",
    photo: "https://img.a.transfermarkt.technology/portrait/header/994536-1724680136.jpg",
  },
  "Lamine Yamal": {
    player: "Lamine Yamal", signal: "HOLD", confidence: "high",
    priceTarget: null,
    timeframe: "Through WC Final (July 19)", catalyst: "At ATH. Hold through WC. Spain favorites.",
    worldCup2026: true, stage: "rising", age: 18, club: "Barcelona",
    photo: "https://img.a.transfermarkt.technology/portrait/header/937958-1727938734.jpg",
  },
  "Endrick": {
    player: "Endrick", signal: "SELL", confidence: "high",
    priceTarget: null,
    timeframe: "Sell June 11-25 (Brazil group stage)", catalyst: "Overpriced vs output. Sell into WC hype.",
    worldCup2026: true, stage: "rising", age: 19, club: "Lyon",
    photo: "https://img.a.transfermarkt.technology/portrait/header/971570-1722420907.jpg",
  },
  "Viktor Gyokeres": {
    player: "Viktor Gyokeres", signal: "SELL", confidence: "medium",
    priceTarget: null,
    timeframe: "Before PL season ends", catalyst: "Peaked at transfer. 0 assists. Limited upside.",
    worldCup2026: true, stage: "peak", age: 27, club: "Arsenal",
    photo: "https://img.a.transfermarkt.technology/portrait/header/325443-1727089927.jpg",
  },
  "Cristiano Ronaldo": {
    player: "Cristiano Ronaldo", signal: "BUY", confidence: "high",
    priceTarget: { floor: 200, mid: 1000, ceiling: 5000 },
    timeframe: "Hold 5+ years", catalyst: "Last WC. GOAT permanent appreciation.",
    worldCup2026: true, stage: "legacy", age: 41, club: "Al Nassr",
    photo: "https://img.a.transfermarkt.technology/portrait/header/8198-1727938734.jpg",
  },
  "Lionel Messi": {
    player: "Lionel Messi", signal: "BUY", confidence: "high",
    priceTarget: { floor: 200, mid: 1000, ceiling: 10000 },
    timeframe: "Hold 10+ years", catalyst: "GOAT consensus. $1.5M RC record. Jordan-tier.",
    worldCup2026: true, stage: "legacy", age: 38, club: "Inter Miami",
    photo: "https://img.a.transfermarkt.technology/portrait/header/28003-1727938734.jpg",
  },
  "Erling Haaland": {
    player: "Erling Haaland", signal: "BUY", confidence: "medium",
    priceTarget: { floor: 50, mid: 300, ceiling: 1000 },
    timeframe: "Hold 2+ years", catalyst: "Undervalued vs trajectory. 200+ goals at 25.",
    worldCup2026: true, stage: "peak", age: 25, club: "Arsenal",
    photo: "https://img.a.transfermarkt.technology/portrait/header/418560-1727938734.jpg",
  },
  "Kylian Mbappe": {
    player: "Kylian Mbappe", signal: "HOLD", confidence: "high",
    priceTarget: null,
    timeframe: "Stable", catalyst: "Fully priced. Blue-chip slow growth.",
    worldCup2026: true, stage: "peak", age: 27, club: "Real Madrid",
    photo: "https://img.a.transfermarkt.technology/portrait/header/342229-1727938734.jpg",
  },
  "Jude Bellingham": {
    player: "Jude Bellingham", signal: "HOLD", confidence: "medium",
    priceTarget: null,
    timeframe: "Through WC", catalyst: "England captain. Hold for tournament performance.",
    worldCup2026: true, stage: "peak", age: 22, club: "Real Madrid",
    photo: "https://img.a.transfermarkt.technology/portrait/header/581678-1727938734.jpg",
  },
  "Mohamed Salah": {
    player: "Mohamed Salah", signal: "BUY", confidence: "medium",
    priceTarget: { floor: 50, mid: 300, ceiling: 1500 },
    timeframe: "Hold 2+ years", catalyst: "Gold refractors undervalued. Egypt WC.",
    worldCup2026: true, stage: "peak", age: 33, club: "Liverpool",
    photo: "https://img.a.transfermarkt.technology/portrait/header/148455-1727938734.jpg",
  },
  "Cole Palmer": {
    player: "Cole Palmer", signal: "BUY", confidence: "medium",
    priceTarget: { floor: 20, mid: 100, ceiling: 300 },
    timeframe: "Hold through WC", catalyst: "England squad. Chelsea star. Cards still accessible.",
    worldCup2026: true, stage: "rising", age: 22, club: "Chelsea",
    photo: "https://img.a.transfermarkt.technology/portrait/header/568177-1727938734.jpg",
  },
  "Warren Zaire-Emery": {
    player: "Warren Zaire-Emery", signal: "BUY", confidence: "medium",
    priceTarget: { floor: 15, mid: 80, ceiling: 200 },
    timeframe: "6-12 months", catalyst: "PSG starter at 20. France future.",
    worldCup2026: false, stage: "rising", age: 20, club: "PSG",
    photo: "https://img.a.transfermarkt.technology/portrait/header/898238-1727089927.jpg",
  },
};

// Helper: find signal for a listing title
export function getPlayerSignal(title: string): PlayerSignal | null {
  const t = title.toLowerCase();
  for (const [name, sig] of Object.entries(playerSignals)) {
    const parts = name.toLowerCase().split(" ");
    const last = parts[parts.length - 1];
    if (last.length >= 4 && t.includes(last)) {
      const first = parts[0];
      if (first.length >= 3 && t.includes(first)) return sig;
      if (last.length >= 5) return sig;
    }
  }
  return null;
}

// Signal styling
export const signalStyles: Record<Signal, { color: string; bg: string }> = {
  BUY: { color: "#fff", bg: "#0d9f4f" },
  SELL: { color: "#fff", bg: "#dc2626" },
  HOLD: { color: "#fff", bg: "#7c3aed" },
  WATCH: { color: "#fff", bg: "#2563eb" },
};
