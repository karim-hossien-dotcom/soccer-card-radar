/**
 * Research Engine — defines WHICH players to track, WHAT cards to search for,
 * and WHY (buy/sell/hold signals). Everything downstream consumes this.
 */

export type Signal = "BUY" | "SELL" | "HOLD";
export type Lane = "rookie" | "steal" | "legacy";

export interface ResearchAction {
  id: string;
  player: string;
  signal: Signal;
  lane: Lane;
  searchQueries: string[]; // exact eBay queries
  soldData: {
    avgPrice: number;
    lastSold: { price: number; date: string }[];
    trend: "up" | "down" | "flat";
  } | null; // null until first scan populates it
  stats: {
    goals: number;
    assists: number;
    apps: number;
    rating: number;
    age: number;
    club: string;
    league: string;
  } | null; // null until web search populates it
  reasoning: string;
  catalyst: string;
  timeframe: string;
  photo: string; // player headshot URL
}

export const signalStyles: Record<Signal, { color: string; bg: string }> = {
  BUY: { color: "#fff", bg: "#0d9f4f" },
  SELL: { color: "#fff", bg: "#dc2626" },
  HOLD: { color: "#fff", bg: "#7c3aed" },
};

export function getResearchActions(): ResearchAction[] {
  return [
    // ─── Lane 1: Rookie Scout ──────────────────────────────────────────────

    {
      id: "lennart-karl",
      player: "Lennart Karl",
      signal: "BUY",
      lane: "rookie",
      searchQueries: [
        "Lennart Karl auto Topps Chrome /50",
        "Lennart Karl auto Topps Chrome /25",
        "Lennart Karl auto Topps Deco /10",
        "Lennart Karl rookie refractor /50",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "17-year-old broke Mbappé's consecutive UCL scoring record. PSG-linked, French pipeline. Cards are still under the radar before mainstream collectors catch on.",
      catalyst: "Broke Mbappé's UCL consecutive scoring record at age 17. World Cup 2026 squad candidacy and big-club transfer likely to trigger first price surge.",
      timeframe: "3–9 months",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/1062628-1726643498.jpg",
    },

    {
      id: "santiago-castro",
      player: "Santiago Castro",
      signal: "BUY",
      lane: "rookie",
      searchQueries: [
        "Santiago Castro Merlin Chrome auto /50",
        "Santiago Castro Merlin Chrome auto /25",
        "Santiago Castro PSA 10 auto",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "PSA 10 autos sitting at ~$20 — extreme value for a confirmed Argentina World Cup 2026 squad player. South American superstars see 5–10× spikes during tournaments.",
      catalyst: "Confirmed Argentina WC 2026 squad. Panini Prizm WC release on May 22 will bring wave of Argentina collector demand.",
      timeframe: "2–6 months (WC catalyst)",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/939498-1694590849.jpg",
    },

    {
      id: "geovany-quenda",
      player: "Geovany Quenda",
      signal: "BUY",
      lane: "rookie",
      searchQueries: [
        "Geovany Quenda Merlin Chrome auto /75",
        "Geovany Quenda Merlin Chrome auto /50",
        "Geovany Quenda refractor /50 rookie",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "Sporting CP breakout with big-club transfer whispers this summer. Low floor, massive upside. Get in before the transfer announcement.",
      catalyst: "Summer big-club transfer rumored. Transfer window opens July 1 — announcement would push card prices 3–5× overnight.",
      timeframe: "1–4 months",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/1096058-1727089927.jpg",
    },

    {
      id: "ethan-nwaneri",
      player: "Ethan Nwaneri",
      signal: "BUY",
      lane: "rookie",
      searchQueries: [
        "Ethan Nwaneri Topps Chrome auto /99",
        "Ethan Nwaneri Topps Chrome auto /50",
        "Ethan Nwaneri Topps Finest auto",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "Filling in for Saka as Arsenal starter. England U21 regular. If Arsenal win the PL or he locks an England WC squad spot, rookie autos will be highly sought.",
      catalyst: "Arsenal title push + England WC 2026 squad selection in June. Both catalysts converge within 60 days.",
      timeframe: "2–5 months",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/946498-1727089927.jpg",
    },

    {
      id: "nico-paz",
      player: "Nico Paz",
      signal: "BUY",
      lane: "rookie",
      searchQueries: [
        "Nico Paz Chrome Sapphire auto /50",
        "Nico Paz refractor /50 rookie",
        "Nico Paz gold refractor /50",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "12G 6A in Serie A at age 20. Real Madrid buy-back clause means a return to the Bernabéu is on the table. Combine that with Argentina WC 2026 upside and this is exceptional value.",
      catalyst: "Real Madrid buy-back clause could trigger before WC. Argentina squad inclusion + Prizm WC release = double catalyst.",
      timeframe: "2–8 months",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/948294-1724316705.jpg",
    },

    {
      id: "kobbie-mainoo",
      player: "Kobbie Mainoo",
      signal: "BUY",
      lane: "steal",
      searchQueries: [
        "Kobbie Mainoo auto /50 Merlin 2022",
        "Kobbie Mainoo auto /25 Chrome 2022",
        "Kobbie Mainoo auto /10 Topps",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "Cards dipped 30–40% after a quiet goal-scoring season, but England WC 2026 squad is effectively locked. Buying the dip before tournament hype arrives.",
      catalyst: "England WC squad announcement in June + tournament run to knockout rounds will reignite demand.",
      timeframe: "2–4 months",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/820374-1727089927.jpg",
    },

    {
      id: "shea-lacey",
      player: "Shea Lacey",
      signal: "BUY",
      lane: "rookie",
      searchQueries: [
        "Shea Lacey Chrome auto /25",
        "Shea Lacey Chrome auto /50",
        "Shea Lacey Finest auto /99",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "9G 3A in U21s with Ruben Amorim actively integrating him into Manchester United's first team. PL debut + WC eligibility window = buy window closing fast.",
      catalyst: "Amorim first-team integration at Man United. PL first start or goal would move the needle immediately.",
      timeframe: "1–6 months",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/926309-1727938734.jpg",
    },

    {
      id: "senny-mayulu",
      player: "Senny Mayulu",
      signal: "BUY",
      lane: "rookie",
      searchQueries: [
        "Senny Mayulu Merlin auto /50",
        "Senny Mayulu Zaire-Emery dual auto",
        "Senny Mayulu refractor rookie auto",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "PSG academy product alongside Zaire-Emery. Dual autos with Z-E are a sleeper. France U21 pathway opens WC eligibility. Low-cost entry point.",
      catalyst: "PSG squad integration + France U21 call-ups. Zaire-Emery dual auto demand spills into Mayulu cards.",
      timeframe: "3–12 months",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/934969-1727089927.jpg",
    },

    {
      id: "eli-junior-kroupi",
      player: "Eli Junior Kroupi",
      signal: "BUY",
      lane: "rookie",
      searchQueries: [
        "Eli Junior Kroupi auto /50",
        "Eli Junior Kroupi refractor /50 rookie",
        "Eli Junior Kroupi gold refractor",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "17-year-old playing Premier League minutes at Bournemouth. Speculative high-upside play — if he becomes the next breakout English forward, early autos will be impossible to find.",
      catalyst: "Age and upside alone. Any breakout moment at Bournemouth (goal vs. top-6 side) will spike demand.",
      timeframe: "6–18 months (speculative)",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/1091498-1725354600.jpg",
    },

    {
      id: "claudio-echeverri",
      player: "Claudio Echeverri",
      signal: "BUY",
      lane: "rookie",
      searchQueries: [
        "Claudio Echeverri refractor /50 rookie Chrome",
        "Claudio Echeverri SSP rookie",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "Messi comps. Quiet at Girona on loan, but Manchester City return this summer will ignite the market. Buy while Girona loan depresses prices.",
      catalyst: "Man City return rumored for summer. Pep Guardiola debut at Etihad = immediate price spike. Argentina WC 2026 squad is a bonus catalyst.",
      timeframe: "2–5 months",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/994536-1724680136.jpg",
    },

    {
      id: "lamine-yamal",
      player: "Lamine Yamal",
      signal: "HOLD",
      lane: "steal",
      searchQueries: [
        "Lamine Yamal auto /50 Chrome",
        "Lamine Yamal SSP case hit",
        "Lamine Yamal auto /25",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "2nd in Ballon d'Or at 18. Prices are at ATH — excellent hold through World Cup 2026 but no asymmetric buy entry right now. If Spain win WC, sell into peak euphoria.",
      catalyst: "World Cup 2026 with Spain. Tournament success is the only remaining catalyst at current valuations.",
      timeframe: "Hold through July 2026 WC final",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/937958-1727938734.jpg",
    },

    {
      id: "cole-palmer",
      player: "Cole Palmer",
      signal: "BUY",
      lane: "steal",
      searchQueries: [
        "Cole Palmer auto /50 Topps Select",
        "Cole Palmer auto /25 Chrome",
        "Cole Palmer gold wave /10",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "Chelsea star and England squad lock. Prices are accessible vs. on-pitch output. One big WC game could 3× card values. Buy before squad announcement.",
      catalyst: "England WC squad lock + tournament performance. Accessible price point relative to talent level.",
      timeframe: "2–4 months",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/568177-1727938734.jpg",
    },

    {
      id: "mateus-mane",
      player: "Mateus Mane",
      signal: "BUY",
      lane: "rookie",
      searchQueries: [
        "Mateus Mane auto Topps Chrome Premier League",
        "Mateus Mane refractor /50 rookie",
        "Mateus Mane auto /25 Chrome",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "18yo getting PL minutes at Wolves. 2G 1A. Cards will be ultra cheap — speculative play with high ceiling if he breaks out. Same profile as Kroupi.",
      catalyst: "Continued PL starts. Summer transfer to bigger club = instant spike.",
      timeframe: "Long-term hold (12+ months)",
      photo: "",
    },

    // ─── Lane 2: Stars (Current Steals + Established) ─────────────────────

    {
      id: "jude-bellingham",
      player: "Jude Bellingham",
      signal: "HOLD",
      lane: "steal",
      searchQueries: [
        "Jude Bellingham auto /50 Chrome 2020",
        "Jude Bellingham auto /25 Sapphire",
        "Jude Bellingham Prizm /50 refractor",
      ],
      soldData: null, stats: null,
      reasoning: "Real Madrid star. England captain for WC 2026. RC year was 2020-21 Chrome. Cards stabilized after Ballon d'Or campaign.",
      catalyst: "England WC 2026 run. Deep run = spike.",
      timeframe: "Hold through WC",
      photo: "",
    },
    {
      id: "vinicius-junior",
      player: "Vinicius Junior",
      signal: "BUY",
      lane: "steal",
      searchQueries: [
        "Vinicius Junior auto /50 Chrome",
        "Vinicius Junior auto /25 Topps",
        "Vinicius Junior gold refractor /50",
      ],
      soldData: null, stats: null,
      reasoning: "Ballon d'Or contender. Brazil WC star. Cards dipped after award snub — good entry point before WC.",
      catalyst: "Brazil WC 2026. If he performs = massive spike.",
      timeframe: "Before WC June 11",
      photo: "",
    },
    {
      id: "florian-wirtz",
      player: "Florian Wirtz",
      signal: "BUY",
      lane: "steal",
      searchQueries: [
        "Florian Wirtz auto /50 Chrome Bundesliga",
        "Florian Wirtz auto /25 Topps",
        "Florian Wirtz refractor /50 rookie",
      ],
      soldData: null, stats: null,
      reasoning: "Germany's best talent. Leverkusen invincible season. Transfer to Real Madrid or Bayern rumored. Cards still accessible.",
      catalyst: "Germany WC 2026 on home soil + big transfer imminent.",
      timeframe: "Before WC June 11",
      photo: "",
    },

    {
      id: "erling-haaland",
      player: "Erling Haaland",
      signal: "BUY",
      lane: "steal",
      searchQueries: [
        "Erling Haaland auto /50 Chrome",
        "Erling Haaland auto /25 Sapphire",
        "Erling Haaland auto refractor /50",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "200+ career goals at age 25. Undervalued vs. career trajectory and eventual legacy status. Norway WC absence has suppressed prices — that discount won't last once he hits further milestones.",
      catalyst: "200-goal club milestone already passed. Champions League run + Norway's WC qualification pathway create multiple price triggers.",
      timeframe: "6–18 months",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/418560-1727938734.jpg",
    },

    // ─── Lane 3: Legacy ────────────────────────────────────────────────────

    {
      id: "cristiano-ronaldo",
      player: "Cristiano Ronaldo",
      signal: "BUY",
      lane: "legacy",
      searchQueries: [
        "Cristiano Ronaldo Prizm World Cup /199",
        "Cristiano Ronaldo auto /50 Panini",
        "Cristiano Ronaldo auto /10",
        "Cristiano Ronaldo Kaboom Donruss",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "Confirmed last World Cup. GOAT debate participant with permanent appreciation curve. WC 2026 is the last chance for Ronaldo tournament cards — any last-WC narrative drives demand for years post-retirement.",
      catalyst: "World Cup 2026 confirmed as final WC. Post-tournament retirement narrative will sustain appreciation for 5–10 years.",
      timeframe: "Long-term hold (2–5 years)",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/8198-1727938734.jpg",
    },

    {
      id: "lionel-messi",
      player: "Lionel Messi",
      signal: "BUY",
      lane: "legacy",
      searchQueries: [
        "Lionel Messi Prizm World Cup gold /50",
        "Lionel Messi auto /50",
        "Lionel Messi Select gold wave /10",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "$1.5M RC record holder. GOAT consensus established. Likely last WC creates a once-in-a-generation scarcity narrative for tournament cards. Prices will only increase post-career.",
      catalyst: "World Cup 2026 likely last tournament. $1.5M RC record reinforces ceiling. Post-career appreciation is inevitable.",
      timeframe: "Long-term hold (2–10 years)",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/28003-1727938734.jpg",
    },

    {
      id: "kylian-mbappe",
      player: "Kylian Mbappe",
      signal: "HOLD",
      lane: "steal",
      searchQueries: [
        "Kylian Mbappe Prizm World Cup rookie",
        "Kylian Mbappe auto /50 Chrome",
        "Kylian Mbappe Donruss Optic /50",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "2018 WC RC PSA 10 stable at ~$190. Market fully priced in. Blue-chip hold — won't 10x but won't crash. France WC contender.",
      catalyst: "France WC 2026 run. If France wins = spike. Otherwise stable.",
      timeframe: "Hold — slow appreciation",
      photo: "",
    },
    {
      id: "mohamed-salah",
      player: "Mohamed Salah",
      signal: "BUY",
      lane: "legacy",
      searchQueries: [
        "Mohamed Salah gold refractor /50 Chrome",
        "Mohamed Salah auto /50 Topps",
        "Mohamed Salah /25 Chrome refractor",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "Gold refractors still undervalued for a player of his caliber. Egypt WC squad. 2017 Chrome Gold /50 is a grail — anything under $1K is a deal.",
      catalyst: "Egypt WC 2026 + potential Liverpool farewell season",
      timeframe: "6-12 months",
      photo: "",
    },

    {
      id: "neymar-jr",
      player: "Neymar Jr",
      signal: "BUY",
      lane: "legacy",
      searchQueries: [
        "Neymar auto /50 Panini",
        "Neymar Prizm World Cup /50",
        "Neymar auto /25 Chrome",
      ],
      soldData: null, stats: null,
      reasoning: "Career winding down but legacy cards hold. 2014/2018 WC Prizms are collectible. Auto prices accessible.",
      catalyst: "Retirement approaching. Legacy premium building.",
      timeframe: "Long-term hold",
      photo: "",
    },
    {
      id: "robert-lewandowski",
      player: "Robert Lewandowski",
      signal: "BUY",
      lane: "legacy",
      searchQueries: [
        "Lewandowski auto /50 Chrome",
        "Lewandowski gold refractor /50",
        "Lewandowski auto /25 Topps",
      ],
      soldData: null, stats: null,
      reasoning: "All-time Bundesliga goal scorer. Barcelona. 2017 Chrome Gold /50 is a grail. Still performing at 37.",
      catalyst: "Poland WC 2026. Final tournament.",
      timeframe: "Hold 2-5 years",
      photo: "",
    },

    // ─── SELL Targets ──────────────────────────────────────────────────────

    {
      id: "endrick",
      player: "Endrick",
      signal: "SELL",
      lane: "rookie",
      searchQueries: [
        "Endrick auto /50 Merlin",
        "Endrick auto /25 Obsidian",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "On loan at Lyon, not starting. Cards are priced for a Real Madrid starter, not a fringe squad player. Hype from 2023–24 has not been matched by output. Sell into any brief uptick.",
      catalyst: "Overpriced vs. actual minutes and output. Lyon loan + 0 regular PL starts = no near-term price catalyst.",
      timeframe: "Sell now — no near-term catalyst",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/971570-1722420907.jpg",
    },

    {
      id: "viktor-gyokeres",
      player: "Viktor Gyokeres",
      signal: "SELL",
      lane: "steal",
      searchQueries: [
        "Viktor Gyokeres auto /50 Chrome",
        "Viktor Gyokeres auto /25",
      ],
      soldData: null,
      stats: null,
      reasoning:
        "Arsenal transfer peaked the market — price already baked in. 0 assists in the PL and not the dominant force expected. Sell before WC exclusion becomes apparent.",
      catalyst: "Transfer hype fully priced in. 0 PL assists depresses long-term value. Sweden likely out of WC contention.",
      timeframe: "Sell now or within 30 days",
      photo:
        "https://img.a.transfermarkt.technology/portrait/header/325443-1727089927.jpg",
    },
  ];
}
