import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parsed from Karim's eBay watchlist dump (2026-04-28)
const watchlistItems = [
  { title: "Senny Mayulu 2024-25 Topps Merlin UCC Refractor Auto RC AU-SM -PL1", price: 13.50, bids: 10 },
  { title: "Illia Zabarnyi 2023-24 Panini Impeccable Premier League Rookie Metal RC /74 #8", price: 3.65, bids: 2 },
  { title: "2025-26 Topps Chrome Bundes. Christian Kofane ROOKIE /50 Wavefractor Leverkusen", price: 54.00, bids: 11 },
  { title: "Omar Marmoush 2025-26 Topps Chrome Premier League RetroFractor Base /92 #121", price: 2.35, bids: 3 },
  { title: "Santiago Castro 2024-25 Topps Merlin UCC Refractor Auto RC AU-SC -K5E", price: 14.00, bids: 4 },
  { title: "2025-26 Topps Chrome Matheus Cunha Triple Platinum Case hit PSA 9", price: 51.00, bids: 6, graded: true },
  { title: "Claudio Echeverri 2025-26 Topps Chrome Bundesliga Gold Mini-Diamond RC /50 #68", price: 6.50, bids: 7 },
  { title: "Topps Jade Edition 2022-23 Vinicius Junior #20 Real Madrid Yellow Jade /50 UEFA", price: 0.99, bids: 1 },
  { title: "Mohamed Salah 2024-25 Topps Chrome UCC Japan Edition Hero SSP #HR-8 -DH5", price: 18.00, bids: 6 },
  { title: "Toby Collyer 2024-25 Topps Merlin UCC Magenta Refractor Auto RC /125 AU-TC", price: 12.15, bids: 4 },
  { title: "Claudio Echeverri 2025-26 Topps Chrome Bundesliga All-Etch Rookies SSP RC #RR-9", price: 12.50, bids: 5 },
  { title: "2024-25 Topps Merlin Chrome UEFA Archie Gray Auto RC Orange Refractor #/25", price: 36.12, bids: 15 },
  { title: "Jobe Bellingham 2025-26 Topps Chrome Bundesliga All-Etch Rookies SSP RC #RR-1 -a", price: 15.05, bids: 4 },
  { title: "2024-25 Topps Chrome UEFA Toby Collyer RC Toppsfractor Rookie #/52 Man U", price: 6.50, bids: 9 },
  { title: "2026 Topps Chrome Premier League Bryan Mbeumo Auto Black Geometric #/10", price: 277.01, bids: 13 },
  { title: "2021-22 Topps Chrome Sapphire Kylian Mbappe Gold /99 France PSG", price: 31.00, bids: 16 },
  { title: "2024-25 Panini Obsidian LAMINE YAMAL Iridescent SSP Case Hit Spain #3", price: 405.00, bids: 10 },
  { title: "2025 Topps Merlin UCC Erling Haaland Man City Red Refractor /5", price: 102.50, bids: 12 },
  { title: "2022-23 Topps Merlin Chrome UEFA Warren Zaire-Emery Auto RC Gold Refractor #/50", price: 51.00, bids: 13 },
  { title: "2024-25 Panini Select FIFA Mohamed Salah Stained Glass SP #19 Liverpool", price: 133.50, bids: 31 },
  { title: "COLE PALMER 2024-25 PANINI SELECT P/L #182 MEZZANINE GOLD WAVE PRIZM 7/10", price: 26.00, bids: 13 },
  { title: "2025-26 Topps Manchester UTD Team Set BENJAMIN SESKO Rainbow Flick SSP Case Hit", price: 28.00, bids: 30 },
  { title: "2026 Panini Prizm Monopoly Vini Jr. Black Money Blast SSP FIFA World Cup Brazil", price: 67.66, bids: 18 },
  { title: "Shea Lacey 2025-26 Topps Chrome Premier League Orange Auto RC /25 #CA-SL", price: 51.00, bids: 7 },
  { title: "2024-25 Topps Merlin Chrome Charalampos Kostoulas Auto RC Green Refractor #/99", price: 13.50, bids: 9 },
  { title: "2019/20 Topps Chrome UEFA Champions League Soccer Hobby Box #JBC", price: 373.00, bids: 14, isBox: true },
  { title: "CRISTIANO RONALDO PSA 10 2018 PANINI DONRUSS OPTIC #9 RED VELOCITY PRIZM 05/50", price: 203.50, bids: 16, graded: true },
  { title: "POP 5 CRISTIANO RONALDO PSA 10 2018 PANINI DONRUSS OPTIC #158 RED VELOCITY 11/50", price: 470.00, bids: 33, graded: true },
  { title: "KYLIAN MBAPPE PSA 10 2018 PANINI DONRUSS OPTIC #53 RED VELOCITY PRIZM 19/50 RC", price: 155.00, bids: 18, graded: true },
  { title: "KENAN YILDIZ PSA 10 2023 PANINI SELECT SERIE A #192 GOLD PRIZM RC MEZZANINE 6/10", price: 3000.00, bids: 30, graded: true },
  { title: "2025-26 Topps Premier League Autographs Paul Scholes Black /10 PSA 9", price: 67.00, bids: 12, graded: true },
  { title: "2025-26 Topps Chrome Bryan Mbeumo Cold & Rainy Night Case Hit PSA 10", price: 31.00, bids: 15, graded: true },
  { title: "2025-26 Topps Chrome Manchester United Matheus Cunha Black Wave /10 PSA 9", price: 51.00, bids: 17, graded: true },
  { title: "2020-21 Panini Obsidian Kylian Mbappe Electric Etch Red Flood #/28 PSG PSA 10", price: 102.50, bids: 26, graded: true },
  { title: "2022-23 Topps Stadium Club Chrome UEFA Competitions 1/25 Kobbie Mainoo Auto 1b7p", price: 690.00, bids: 0, buyNow: true },
  { title: "2018 Panini Eminence Autographs Auto NEYMAR JR /10!! Sealed", price: 93.00, bids: 14 },
  { title: "Toby Collyer 2024-25 Topps Merlin UCC Pink Refractor Auto RC /199 AU-TC", price: 0.99, bids: 0 },
  { title: "Konstantinos Karetsas 2025-26 Topps UCC Epicenter SSP RC #EC-22", price: 32.00, bids: 17 },
  { title: "2024-25 Topps Merlin Chrome UEFA Mohamed Salah Renaissance #R-12 Liverpool", price: 121.00, bids: 17 },
  { title: "2024-25 Panini Donruss Cristiano Ronaldo Kaboom #14 Portugal", price: 500.00, bids: 21 },
  { title: "2021-22 Panini Prizm Premier Cristiano Ronaldo Auto Purple /10 PSA 10 POP3", price: 2575.00, bids: 21, graded: true },
  { title: "AL AHLY SC 2002 2003 HOME FOOTBALL SHIRT #11 EGYPT JERSEY SIZE XL", price: 95.99, bids: 0, buyNow: true, isJersey: true },
  { title: "2014 Panini Prizm World Cup - Cristiano Ronaldo #161 Blue Prizm /199 PSA 9", price: 940.00, bids: 25, graded: true },
  { title: "MOHAMED SALAH 2017 TOPPS CHROME UCL SOCCER #24 GOLD REFRACTOR 42/50", price: 1033.00, bids: 21 },
  { title: "Cristiano Ronaldo 2023 Topps Chrome UEFA #115 Legendary SP VAR", price: 61.00, bids: 16 },
  { title: "2025-26 Topps Chrome Premier League Shea Lacey Man Utd RC 07/50 Gold RayWave", price: 89.50, bids: 0, buyNow: true },
  { title: "Kobbie Mainoo Auto Relic /150 Topps Museum UEFA Manchester United MAR-KM", price: 6.50, bids: 10 },
  { title: "2024-25 Topps Merlin UCC Chido Obi Gold Auto /50 Manchester United RC", price: 115.00, bids: 0, buyNow: true },
  { title: "2024-25 Topps Merlin Uefa UCC Endrick Rookie Gold Refractor /50", price: 115.22, bids: 0, buyNow: true },
  { title: "2023-24 Panini Impeccable Dual Materials Alejandro Garnacho/Kobbie Mainoo 1/1", price: 800.00, bids: 0, buyNow: true },
  { title: "2020-21 TOPPS UEFA CHAMPIONS LEAGUE CHROME SOCCER SEALED HOBBY BOX JUDE RC", price: 309.00, bids: 0, buyNow: true, isBox: true },
  { title: "Topps 2022-23 Merlin Chrome UCC Kobbie Mainoo RC Blue #/75", price: 65.00, bids: 0, buyNow: true },
  { title: "2021/22 TOPPS STADIUM CLUB CHROME UEFA CL SOCCER HOBBY BOX", price: 314.95, bids: 0, buyNow: true, isBox: true },
  { title: "2024-25 Topps Merlin Chrome Alejandro Garnacho Kobbie Mainoo Match Ball Auto /5", price: 650.00, bids: 0, buyNow: true },
  { title: "2024-25 Topps Merlin Endrick Gold Speckle Refractor #/50 Real Madrid RC", price: 115.22, bids: 0, buyNow: true },
  { title: "Panini Impeccable Cristiano Ronaldo Auto /99 PSA 8", price: 4223.79, bids: 0, buyNow: true, graded: true },
  { title: "2024-25 Topps Merlin Uefa Club Competitions - Autographs Christos Mouzakitis", price: 200.00, bids: 0, buyNow: true },
  { title: "2024-25 TOPPS DYNASTY UEFA DUAL AUTO /10 JUDE BELLINGHAM KOBBIE MAINOO AUTOGRAPH", price: 3300.00, bids: 0, buyNow: true },
  { title: "Cristiano Ronaldo 2018 Prizm World Cup Gold Power Landmark /5 Ultra Rare SP PSA", price: 500000.00, bids: 0, buyNow: true, graded: true },
];

async function importWatchlist() {
  console.log(`Importing ${watchlistItems.length} watchlist items...\n`);

  let imported = 0;
  let skipped = 0;

  for (const item of watchlistItems) {
    // Skip boxes and jerseys — not individual cards
    if ((item as Record<string, unknown>).isBox || (item as Record<string, unknown>).isJersey) {
      console.log(`  SKIP (not a card): ${item.title.slice(0, 60)}`);
      skipped++;
      continue;
    }

    const { error } = await supabase.from("Listing").upsert(
      {
        platform: "ebay",
        externalId: `watchlist_${imported}`,
        url: `https://www.ebay.com/itm/watchlist_${imported}`,
        title: item.title,
        priceUSD: item.price,
        priceNative: item.price,
        currency: "USD",
        rawData: { source: "watchlist_import", bids: item.bids, graded: (item as Record<string, unknown>).graded ?? false },
      },
      { onConflict: "platform,externalId" }
    );

    if (error) {
      console.error(`  FAIL: ${item.title.slice(0, 50)} — ${error.message}`);
    } else {
      console.log(`  OK: $${item.price.toFixed(2)} — ${item.title.slice(0, 70)}`);
      imported++;
    }
  }

  console.log(`\nDone: ${imported} imported, ${skipped} skipped`);
}

importWatchlist();
