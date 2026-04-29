import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Full watchlist dump — 120 items (2026-04-29)
// Includes all items from both pages
const watchlistItems = [
  // === PAGE 1 (ending soonest) ===
  { title: "Erling Haaland 2023-24 Topps Finest UEFA Euro Prized Footballers Gold /50 CGC 10", price: 62.00, graded: true },
  { title: "Mohamed Salah 2024-25 Topps Merlin UCC Black White Vintage Merlin Base /35 #11", price: 9.50 },
  { title: "2024-25 Topps Chrome Sapphire UEFA Kylian Mbappe Gold #/50 Real Madrid", price: 48.00 },
  { title: "Shea Lacey 2025-26 Topps Chrome Premier League Orange Auto RC /25 #CA-SL", price: 255.00 },
  { title: "2024 Topps Chrome UEFA Ethan Nwaneri Rookie Black Lazer Auto Green /99 - PSA 10", price: 102.50, graded: true },
  { title: "2024-25 Topps Merlin Chrome Charalampos Kostoulas Auto RC Green Refractor #/99", price: 26.19 },
  { title: "2019/20 Topps Chrome UEFA Champions League Soccer Hobby Box #JBC", price: 408.00, isBox: true },
  { title: "2021-2022 Topps Chrome Sapphire Edition UEFA Champions League Hobby Box Sealed", price: 182.50, isBox: true },
  { title: "2024-25 Topps Museum Jude Bellingham Signature Dual Jersey Auto Gold #/50", price: 137.50 },
  { title: "Cristiano Ronaldo Signed Portugal 2014 World Cup Autographed Jersey. ICONS COA", price: 500.00, isJersey: true },
  { title: "Cristiano Ronaldo Signed Manchester United 2005/06 Autographed Jersey. ICONS COA", price: 205.50, isJersey: true },
  { title: "2025/26 Topps UEFA Club Competitions Soccer Hobby Box #ENJ", price: 147.50, isBox: true },
  { title: "2022-23 Topps Stadium Club Chrome UEFA Mohamed Salah Gold Refractor #/50", price: 20.50 },
  { title: "2018 Topps Chrome UEFA Joao Felix Gold Refractor Rookie RC #/50 Benfica", price: 100.00 },
  { title: "2026 Topps Finest Premier League Mohamed Salah /20 Rare Variation", price: 29.00 },
  { title: "2021-22 TOPPS CHROME UEFA CHAMPIONS LEAGUE UCL SOCCER SEALED LITE HOBBY BOX", price: 21.50, isBox: true },
  { title: "CRISTIANO RONALDO PSA 10 2018 PANINI DONRUSS OPTIC #9 RED VELOCITY PRIZM 05/50", price: 208.50, graded: true },
  { title: "POP 5 CRISTIANO RONALDO PSA 10 2018 PANINI DONRUSS OPTIC #158 RED VELOCITY 11/50", price: 610.00, graded: true },
  { title: "NICO PAZ PSA 10 2023-24 TOPPS CHROME SAPPHIRE UCC #66 GOLD REFRACTOR RC 50/50", price: 560.00, graded: true },
  { title: "KYLIAN MBAPPE PSA 10 2018 PANINI DONRUSS OPTIC #53 RED VELOCITY PRIZM 19/50 RC", price: 216.50, graded: true },
  { title: "KENAN YILDIZ PSA 10 2023 PANINI SELECT SERIE A #192 GOLD PRIZM RC MEZZANINE 6/10", price: 3000.00, graded: true },
  { title: "2025-26 Topps Finest Premier League Bendito Mantato Gold Refractor /50 Auto RC", price: 17.98 },
  { title: "2025-26 Topps Chrome Lennart Karl Jobe Bellingham Yan Diomande Triple Auto /25", price: 630.00 },
  { title: "2025/26 Topps UEFA Club Competitions Soccer Hobby Box #BVG", price: 107.50, isBox: true },
  { title: "2019-2020 Panini Select UEFA Euro Preview Hobby Box - Factory Sealed [Auto]", price: 499.99, isBox: true },
  { title: "2025-26 Topps Premier League Autographs Paul Scholes Black /10 PSA 9", price: 78.00, graded: true },
  { title: "2025-26 Topps Chrome Manchester United Bryan Mbeumo Gold Wave Auto /50 PSA 9", price: 102.50, graded: true },
  { title: "2025-26 Topps Chrome Bryan Mbeumo Cold & Rainy Night Case Hit PSA 10", price: 56.00, graded: true },
  { title: "2025-26 Topps Chrome Matheus Cunha Genius Chrome Case hit PSA 10", price: 81.00, graded: true },
  { title: "2025-26 Topps Chrome Manchester United Matheus Cunha Black Wave /10 PSA 9", price: 152.50, graded: true },
  { title: "2024-25 Topps Museum Collection UEFA Champions League Soccer Hobby Box Sealed", price: 142.50, isBox: true },
  { title: "Claudio Echeverri 2025-26 Topps Chrome Bundesliga Gold Wave Base RC /50 #68", price: 7.50 },
  { title: "2023-24 Panini Immaculate Endrick Images RC Gold Rookie #/10 PSA 8", price: 247.50, graded: true },
  { title: "2020-21 Panini Obsidian Kylian Mbappe Electric Etch Red Flood #/28 PSG PSA 10", price: 102.50, graded: true },
  { title: "2022-23 Topps Chrome Sapphire Jude Bellingham Selections Auto #/5 Red PSA 10", price: 493.00, graded: true },
  { title: "2024 OBSIDIAN MICHAEL OLISE CUTTING EDGE ELECTRIC ETCH GOLD FLOOD DUAL PATCH /10", price: 107.74 },
  { title: "2023-24 Panini Obsidian Endrick Aurora Auto Electric Etch RC Red #/15 PSA 10", price: 565.00, graded: true },
  { title: "2026 Topps Chrome Premier League Viktor Gyokeres Auto Red Wave Refractor #/5", price: 730.00 },
  { title: "2025/26 Topps English Premier League Chrome Soccer Hobby Box #ZOG", price: 179.50, isBox: true },
  { title: "2020-21 TOPPS CHROME UEFA CHAMPIONS LEAGUE SOCCER SEALED SAPPHIRE HOBBY BOX UCL", price: 314.00, isBox: true },
  { title: "Jamal Musiala 2024-25 Topps Chrome Bundesliga Gold Lava Auto /50 #BA-JM", price: 23.50 },
  { title: "2010-11 Topps Premier Gold Hundred Club Ryan Giggs /105 BGS 9.5 w/ 10 AUTO", price: 112.50, graded: true },
  { title: "2024-25 Topps Finest UEFA Club Competitions Soccer Factory Sealed Hobby Box", price: 122.50, isBox: true },
  { title: "2024-25 Topps Inception UEFA Club Competitions Soccer Factory Sealed Hobby Box", price: 530.00, isBox: true },
  { title: "2025/26 Topps English Premier League Chrome Soccer Hobby Box #DHC", price: 275.00, isBox: true },
  { title: "2024-25 Topps Finest UEFA Senny Mayulu/Warren Zaire-Emery Dual Auto Gold /50 RC", price: 199.00 },
  { title: "2025-26 SELECT LA LIGA + DONRUSS WORLD CUP SOCCER HOBBY BOX LOT", price: 610.00, isBox: true },
  { title: "Lot of 2 - 2026 Topps Premier League Premium Debut Edition Hobby Boxes Sealed", price: 311.00, isBox: true },
  { title: "2022-23 Topps Stadium Club Chrome UEFA Competitions 1/25 Kobbie Mainoo Auto 1b7p", price: 690.00 },
  { title: "2022-23 Panini Chronicles Soccer Factory Sealed T-Mall Hobby Mini Box", price: 16.50, isBox: true },
  { title: "2020-21 Topps Chrome EDUARDO CAMAVINGA 36/50 RC Auto Gold Refractor #CA-EC PSA 8", price: 12.50, graded: true },
  { title: "Topps Chrome Premier League 2026 Autograph Ryan Giggs Manchester United /50", price: 50.44 },
  { title: "2018 Panini Eminence Autographs Auto Gold ROBIN VAN PERSIE /5!! Sealed", price: 46.00 },
  { title: "2018 Panini Eminence Autographs Auto NEYMAR JR /10!! Sealed", price: 305.00 },
  { title: "Topps Premier League 2025/2026 Patrice Evra Manchester United Auto Card 10/75", price: 32.89 },
  { title: "2023-24 Panini Select FIFA - Mohamed Salah Mezzanine Gold Wave /10", price: 4.25 },
  { title: "Toby Collyer 2024-25 Topps Merlin UCC Pink Refractor Auto RC /199 AU-TC", price: 4.25 },
  { title: "Konstantinos Karetsas 2025-26 Topps UCC Epicenter SSP RC #EC-22", price: 38.00 },
  { title: "2024-25 Topps Merlin Chrome UEFA Mohamed Salah The Shiny #S-4 Liverpool", price: 141.50 },
  { title: "2024-25 Topps Merlin Chrome UEFA Mohamed Salah Renaissance #R-12 Liverpool", price: 123.50 },
  { title: "2024-25 Panini Donruss Cristiano Ronaldo Kaboom #14 Portugal", price: 1125.00 },
  { title: "2023-24 Topps Finest UEFA Facundo Buonanotte Auto RC Rookie #A-FB PSA 10", price: 1.25, graded: true },
  { title: "2023-24 Topps Finest UEFA Paris Brunner Auto RC Blue #/150 Dortmund PSA 10", price: 3.25, graded: true },
  { title: "2020-21 Topps Chrome UEFA Jude Bellingham Auto RC Gold #/50 Dortmund PSA 8", price: 35.00, graded: true },
  { title: "2021-22 Panini Prizm Premier Cristiano Ronaldo Auto Purple /10 PSA 10 POP3", price: 2700.00, graded: true },
  { title: "2024-25 Panini Select FIFA Mohamed Salah Terrace Gold #/10 Liverpool", price: 72.00 },
  { title: "1/10 2023-24 Select FIFA Lionel Messi #75 Terrace Gold Wave PSA 10 POP 2", price: 1150.00, graded: true },
  { title: "2024-25 Panini Noir Gavi Spotlight Signatures Auto Gold Ink #10/15 Spain G8", price: 9.50 },
  { title: "Robin Van Persie 2025 Topps Chrome Deluxe Manchester United Gold Auto 18/50", price: 13.50, graded: true },
  { title: "Topps Finest Chrome Prem Lge 2026 Shea Lacey Auto /99 Blue Refractor Rookie Card", price: 61.44 },
  { title: "2024-25 Topps Merlin UCC - Hobby Box UEFA Club Competitions", price: 183.50, isBox: true },
  { title: "AL AHLY SC 2002 2003 HOME FOOTBALL SHIRT #11 EGYPT JERSEY SIZE XL", price: 95.99, isJersey: true },
  { title: "2025-26 Topps Finest Premier League Benjamin Sesko GUSTO Auto Black 1/10 Man U", price: 182.50 },
  { title: "2025-26 Panini Select La Liga Ronaldo Vini Jr. Pairings Gold Dual Auto 33/3", price: 154.50 },
  { title: "2025/26 Topps English Premier League Chrome Soccer Hobby Box #XWH", price: 5.50, isBox: true },
  { title: "2021/22 Topps UEFA Champions League Stadium Club Chrome Soccer Mega... #QUB", price: 59.00, isBox: true },
  { title: "2024-25 Topps Inception UEFA Club Competitions Soccer Factory Sealed Hobby Box", price: 405.00, isBox: true },
  { title: "2024/25 Panini Select Premier League EPL Soccer Hobby Exclusive Sealed Mega Box!", price: 10.50, isBox: true },
  { title: "DANIELE DE ROSSI 2017 TOPPS CHROME UCL #63 GOLD REFRACTOR 3/50 ROMA", price: 91.00 },
  { title: "2026 Topps Chrome Sapphire Premier League Eli Junior Kroupi Gold Refractor #/50", price: 85.00 },
  { title: "2014 Panini Prizm World Cup - Cristiano Ronaldo #161 Blue Prizm /199 PSA 9", price: 1247.00, graded: true },
  { title: "KEVIN DE BRUYNE 2024-25 TOPPS CHROME UCC #CA-KD AUTO GOLD REFRACTOR 16/50", price: 59.00 },
  { title: "PEDRI PSA 9 2023-24 TOPPS CHROME SAPPHIRE UCC #CA-P BLACK REFRACTOR AUTO 7/10", price: 202.50, graded: true },
  { title: "CRISTIANO RONALDO PSA 9 2022 FINEST UCC PRIZED FOOTBALLERS FUSION GREEN RED 8/30", price: 53.00, graded: true },
  { title: "2025-26 Manchester United Topps Palatial Hobby Box", price: 1720.00, isBox: true },
  { title: "GARETH BALE 2017 TOPPS CHROME UCL SOCCER #75 ORANGE REFRACTOR 21/25", price: 122.50 },
  { title: "MOHAMED SALAH 2017 TOPPS CHROME UCL SOCCER #24 GOLD REFRACTOR 42/50", price: 1233.00 },
  { title: "Cristiano Ronaldo 2023 Topps Chrome UEFA #115 Legendary SP VAR", price: 63.00 },
  { title: "ROBERT LEWANDOWSKI 2017 TOPPS CHROME UCL SOCCER #78 GOLD REFRACTOR 32/50 BAYERN", price: 123.50 },
  { title: "7838 Santiago Castro 2024 Topps Merlin Chrome UEFA #159 Gold Mojo RC /50 PSA 10", price: 53.00, graded: true },
  { title: "Santiago Castro 2024 Topps Merlin Chrome UEFA #AUSC Pink Auto RC /199 PSA 10", price: 20.50, graded: true },
  { title: "7888 Geovany Quenda 2024 Topps Merlin Chrome UEFA Aqua Mojo Auto RC /75 PSA 10", price: 20.50, graded: true },
  { title: "2025 Panini Prizm FIFA Club World Cup Soccer Factory Sealed Hobby Mega Card Box", price: 7.00, isBox: true },
  { title: "2025-26 Topps Chrome Premier League Shea Lacey Man Utd RC 07/50 Gold RayWave", price: 89.50 },
  { title: "Kobbie Mainoo Auto Relic /150 Topps Museum UEFA Manchester United MAR-KM", price: 10.50 },
  { title: "2024-25 Topps Merlin UCC Chido Obi Gold Auto /50 Manchester United RC", price: 115.00 },
  { title: "ERLING HAALAND 2024-25 TOPPS CHROME SAPPHIRE UCC #CA-EH AUTO RED REFRACTOR 2/5", price: 238.50 },
  { title: "2024-25 Topps Inception UEFA Club Competitions Soccer Factory Sealed Hobby Box", price: 406.00, isBox: true },
  { title: "2025/26 Topps Chrome English Premier League Soccer Sapphire Edition Box #EGB", price: 860.00, isBox: true },
  { title: "2021-22 Panini Mosaic Road to FIFA World Cup Soccer Hobby Box Sealed", price: 127.50, isBox: true },

  // === PAGE 2 ===
  { title: "2021-22 Panini Mosaic Road to FIFA World Cup Soccer Hobby Box Sealed", price: 58.00, isBox: true },
  { title: "2025-26 Panini Select La Liga Soccer Gold Prizm #106 Marcus Rashford 5/10", price: 14.50 },
  { title: "2024-25 Topps Merlin Uefa UCC Endrick Rookie Gold Refractor /50", price: 114.72 },
  { title: "MARCO REUS 2017 TOPPS CHROME UCL SOCCER #35 GOLD REFRACTOR 26/50 BVB", price: 107.50 },
  { title: "WAYNE ROONEY 2024-25 TOPPS DEFINITIVE MARKS OF EXCELLENCE ON-CARD AUTO GOLD /50", price: 4.25 },
  { title: "2023-24 Panini Impeccable Dual Materials Alejandro Garnacho/Kobbie Mainoo 1/1", price: 800.00 },
  { title: "TOBY COLLYER 2024 TOPPS CHROME MERLIN GOLD #AU-TC RC AUTO /50", price: 49.99 },
  { title: "2020-21 TOPPS UEFA CHAMPIONS LEAGUE CHROME SOCCER SEALED HOBBY BOX JUDE RC", price: 309.00, isBox: true },
  { title: "Topps 2022-23 Merlin Chrome UCC Kobbie Mainoo RC Blue #/75", price: 65.00 },
  { title: "2024-25 Topps Merlin Kobbie Mainoo Match Ball Signature Auto Black /10", price: 500.00 },
  { title: "2021/22 TOPPS STADIUM CLUB CHROME UEFA CL SOCCER HOBBY BOX", price: 314.95, isBox: true },
  { title: "2024-25 Topps Merlin Chrome Alejandro Garnacho Kobbie Mainoo Match Ball Auto /5", price: 650.00 },
  { title: "Mohamed Salah 2025 Topps Chrome Hero Variation SSP Liverpool", price: 25.00 },
  { title: "2024-25 Topps Merlin Endrick Gold Speckle Refractor #/50 Real Madrid RC", price: 114.72 },
  { title: "Panini Impeccable Cristiano Ronaldo Auto /99 PSA 8", price: 4211.55, graded: true },
  { title: "2022-23 Topps Stadium Club Chrome UEFA Club Competitions Warren Zaire-Emery Auto", price: 35.00 },
  { title: "2024-25 Topps Merlin Uefa Club Competitions - Autographs Christos Mouzakitis", price: 200.00 },
  { title: "2024-25 TOPPS DYNASTY UEFA DUAL AUTO /10 JUDE BELLINGHAM KOBBIE MAINOO AUTOGRAPH", price: 3300.00 },
  { title: "2024/25 Topps Merlin UEFA Club Competitions Kobbie Mainoo Match Ball Signatures", price: 244.95 },
  { title: "Cristiano Ronaldo 2018 Prizm World Cup Gold Power Landmark /5 Ultra Rare SP PSA", price: 500000.00, graded: true },
];

async function importWatchlistV2() {
  console.log(`Importing ${watchlistItems.length} watchlist items...\n`);

  let imported = 0;
  let skipped = 0;
  let updated = 0;

  for (let i = 0; i < watchlistItems.length; i++) {
    const item = watchlistItems[i];

    if ((item as Record<string, unknown>).isBox || (item as Record<string, unknown>).isJersey) {
      skipped++;
      continue;
    }

    const searchTerms = item.title
      .replace(/[#\-\/()]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 8)
      .join("+");
    const searchUrl = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerms)}&_sacat=212`;

    // Check if already exists by title similarity
    const { data: existing } = await supabase
      .from("Listing")
      .select("id, priceUSD")
      .eq("title", item.title)
      .limit(1);

    if (existing && existing.length > 0) {
      // Update price if changed
      if (existing[0].priceUSD !== item.price) {
        await supabase
          .from("Listing")
          .update({ priceUSD: item.price, priceNative: item.price, lastSeenAt: new Date().toISOString() })
          .eq("id", existing[0].id);
        updated++;
      }
      continue;
    }

    const { error } = await supabase.from("Listing").insert({
      platform: "ebay",
      externalId: `wl2_${i}`,
      url: searchUrl,
      title: item.title,
      priceUSD: item.price,
      priceNative: item.price,
      currency: "USD",
      rawData: { source: "watchlist_v2", graded: (item as Record<string, unknown>).graded ?? false },
    });

    if (error) {
      console.log(`  FAIL: ${item.title.slice(0, 50)} — ${error.message}`);
    } else {
      imported++;
    }
  }

  console.log(`Done: ${imported} new, ${updated} price-updated, ${skipped} non-cards skipped`);
}

importWatchlistV2();
