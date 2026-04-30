# Soccer Card Radar v2 — Research-Driven Rebuild

## Problem

v1 was built iteratively and accumulated debt: 16 cleanup scripts, 5 unused packages, static research disconnected from live data, base cards leaking through display-time filters, and 4 overlapping tabs. The tool should tell Karim "this is a good price — buy it" but instead shows 588 listings he has to evaluate himself.

## Core Principle

**Research defines what to search. Every listing has a reason. No junk gets in.**

## Architecture

```
Research Engine (the brain)
  │
  ├── Lane 1: Rookie Scout
  │   └── web search for stats → eBay sold for prices → find undervalued
  │
  ├── Lane 2: Current Steals
  │   └── eBay sold for established stars → find dips below market
  │
  └── Lane 3: Legacy & Retiring
      └── track Ronaldo/Messi/legends → retirement premium plays
  │
  ▼
Research Actions (structured definitions)
  │ player, signal, searchQueries[], marketPrice (from sold data), reasoning
  │
  ▼
eBay Scan (targeted)
  │ Only searches what actions define. No generic queries.
  │ Compares active listings to sold comps.
  │ Stores ONLY cards priced below avg sold.
  │
  ▼
Dashboard (3 tabs)
  ├── Research: lanes + charts + analysis + scan button
  ├── Buy: cards below market, sorted by urgency
  └── Sell/Avoid: overpriced players/cards
```

## Research Engine

### Data Sources
- **Player stats:** Web search (free, refreshed weekly)
- **Card prices:** eBay Browse API sold filter + active listings (refreshed per scan)

### Three Lanes

**Lane 1: Rookie Scout**
- Players under 23 with breakout stats
- Cross-reference: card prices cheap relative to output
- Discovery: finds NEW players to track, not just a static list
- ~8-10 players at any time

**Lane 2: Current Steals**
- Established stars (24-30) whose cards dipped below recent sold avg
- Also: "steal radar" — any soccer card where a numbered auto/parallel is listed 25%+ below recent sold, regardless of player
- ~5-8 players + opportunistic finds

**Lane 3: Legacy & Retiring**
- Players 30+ approaching retirement or final tournaments
- Ronaldo (confirmed last WC), Messi (likely last WC), others
- ~3-5 players

### Research Actions (output)

Each lane produces structured actions:

```typescript
interface ResearchAction {
  id: string;
  player: string;
  signal: "BUY" | "SELL" | "HOLD";
  lane: "rookie" | "steal" | "legacy";
  
  // Exact search queries (no generic "player name card")
  searchQueries: string[];
  
  // From eBay sold data (NOT hardcoded)
  soldData: {
    avgPrice: number;
    lastSold: { price: number; date: string }[];
    trend: "up" | "down" | "flat";
  };
  
  // From web search
  stats: {
    goals: number;
    assists: number;
    apps: number;
    rating: number;
    age: number;
    club: string;
    league: string;
  } | null;
  
  reasoning: string;
  catalyst: string;
  timeframe: string;
}
```

## Scan Pipeline

Per scan run (~15-30 seconds for quick, ~3-4 min for full):

1. For each research action:
   a. Search eBay sold: `action.searchQueries` → extract sold prices
   b. Update `action.soldData` with fresh comps
   c. Search eBay active: same queries → get current listings
   d. Filter: must pass `isQualityCard()` (no base, no Leaf, etc.)
   e. Compare: only store listings priced BELOW avg sold
   f. Tag each listing with action.id + sold comp data

2. Store in DB with context:
   - listing data (title, price, url, image)
   - which research action found it
   - avg sold price at time of scan
   - % below market

## Quality Filter (absolute, at search time)

**Always search for (in query):** auto, /50, /25, /10, /5, PSA, BGS, SSP

**Hard reject (in filter):** base, Leaf, sticker auto, lot, box, sealed, jersey, sticker, album, digital, unnumbered refractor

**Exception:** Pre-2015 legend cards (Messi, Ronaldo, Maradona) where base/refractor has proven market value ($500+). System checks: age + sold price.

## Dashboard — 3 Tabs

### Tab 1: Research (landing page)

**Top:** Scan button + "Last scanned X min ago"

**Three lanes displayed:**
- Each shows 5-8 players discovered by that lane
- Per player: name, photo, stats line, avg sold price, trend, signal badge, one-line reasoning
- Expandable to show recent sold comps

**Below lanes:** Charts (keep existing: WC cycles, age curve, rookie radar, momentum, market cycle)

**Below charts:** Timing intelligence + upcoming releases

### Tab 2: Buy (action page)

**Every card shown is below market price.** Nothing at or above market appears.

Per card:
- Player name
- Card description (set, year, parallel, numbering)
- Listed price vs avg sold (e.g. "$35 vs avg $46")
- % below market (e.g. "24% below")
- Action: AUCTION 3h 12m / SEND OFFER / BUY NOW
- Direct eBay link

Sorted:
1. Auctions ending within 6 hours (most urgent)
2. Auctions ending within 24 hours
3. BIN with offers (biggest discount first)
4. BIN fixed price (biggest discount first)

No categories, no parallel/auto split. A deal is a deal.

### Tab 3: Sell/Avoid

Players the research flags as overpriced or declining:
- Endrick (overpriced vs output)
- Gyokeres (peaked at transfer)
- Any card listed 25%+ above avg sold

Small tab, ~5-10 items. Useful if Karim owns cards of these players.

## Cleanup — What Gets Deleted

### Packages removed:
- `packages/scrapers/mercari-us/` (Cloudflare blocked)
- `packages/scrapers/buyee/` (stub, never built)
- `packages/alerts/` (stub)
- `packages/extractor/` (Haiku, never used)
- `packages/matcher/` (replaced by research engine)

### Files removed:
- 16 one-off DB scripts in `packages/db/src/`
- `apps/dashboard/src/app/players/` (merged into Research)
- `apps/dashboard/src/app/parallels/` (merged into Buy)
- `apps/dashboard/src/app/autos/` (merged into Buy)
- `apps/dashboard/src/app/api/process/`
- `apps/dashboard/src/app/api/mercari/`
- `apps/dashboard/src/app/api/ebay/watchlist/`

### Kept and refactored:
- `packages/scrapers/ebay/` (auth + Browse API)
- `packages/db/` (Supabase client, updated types)
- `packages/shared/` (updated types)
- `apps/dashboard/` (3 new pages, keep layout/css/charts)

### Database:
- Wipe all listings (fresh start)
- Trim TrackedEntity to ~15 active players
- Repurpose PriceReference for sold comp data
- Delete ExtractionCache (unused)

## New Files

```
apps/dashboard/src/app/
  ├── page.tsx              # Research tab (refactored)
  ├── buy/page.tsx          # Buy tab (new)
  ├── sell/page.tsx         # Sell/Avoid tab (new)
  ├── research-engine.ts    # The brain: lanes, actions, queries
  ├── card-filter.ts        # Quality filter (tightened)
  ├── nav.tsx               # 3 tabs: Research → Buy → Sell
  ├── scan-button.tsx       # Keep
  ├── research/charts.tsx   # Keep
  ├── api/scan/route.ts     # Rewritten: research-driven scan
  └── api/quick-scan/route.ts  # Rewritten: top picks only
```

## Success Criteria

1. Open the dashboard → see fresh data (scanned within 30 min)
2. Every card on Buy tab is below avg sold price — no exceptions
3. No base cards, no Leaf, no junk — ever
4. Can decide "buy or skip" in <10 seconds per card
5. Research tab explains WHY with real data, not static text
6. Scan completes in <30 seconds (quick) or <4 min (full)
7. ≤15 actively tracked players + steal radar for outliers
