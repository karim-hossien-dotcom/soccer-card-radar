// C1 UAT fixture: the 8 seeded targets, researcher form (Yamal/Haaland/Mbappe approved), Karim's own PSA results,
// and synthetic live listings dated now (auctions ending in hours, Buy It Now asks) so the board has prices.
// Usage: node test/uat/make-snipe-fixture.js /tmp/snipe.json   then   SNIPE_FIXTURE=/tmp/snipe.json next dev
const fs = require('fs');
const forms = JSON.parse(fs.readFileSync(__dirname + '/../fixtures/player-form.test.json', 'utf8'));
const T = (id, actionId, card, query, mustInclude, exclude, raw, psa9, psa10, popTotal, pop9, pop10, confidence) =>
  ({ id, actionId, card, query, mustInclude, exclude, raw, psa9, psa10, popTotal, pop9, pop10, printRun: null, ssp: false, compsAsOf: '2026-10-08', confidence, notes: null, active: true, psaCert: null, psaSpecId: null, popAsOf: null });
const graded = ['psa', 'bgs', 'sgc', 'cgc', 'beckett', 'graded', 'lot'];
const colors = ['silver', 'red', 'blue', 'green', 'orange', 'gold', 'purple', 'pink', 'black', 'mojo', 'refractor'];
const targets = [
  T('t1', 'cristiano-ronaldo', '2014 Panini Prizm World Cup #161 Cristiano Ronaldo (base)', '2014 Panini Prizm World Cup Cristiano Ronaldo 161', ['2014', 'prizm', 'ronaldo', '161'], [...graded, ...colors, 'stars', 'captain'], 25, 84, 331, 6599, 3981, 1755, 'High'),
  T('t2', 'lionel-messi', '2014 Panini Prizm World Cup #12 Lionel Messi (base)', '2014 Panini Prizm World Cup Lionel Messi 12', ['2014', 'prizm', 'messi', '12'], [...graded, ...colors, 'stars', 'captain'], 42, 125, 450, 7236, 4026, 2563, 'High'),
  T('t3', 'lamine-yamal', '2023-24 Topps Chrome UCC #64 Lamine Yamal RC (base)', '2023-24 Topps Chrome UCC Lamine Yamal 64 RC', ['2023', 'chrome', 'yamal', '64'], [...graded, ...colors, 'sapphire', 'auto'], 41, 92, 465, 5055, 2519, 2154, 'High'),
  T('t4', 'kylian-mbappe', '2018 Panini Prizm World Cup #80 Kylian Mbappe RC (base)', '2018 Panini Prizm World Cup Kylian Mbappe 80 RC', ['2018', 'prizm', 'mbappe', '80'], [...graded, ...colors], 46, 92, 269, 8899, 4124, 4083, 'Medium'),
  T('t5', 'cristiano-ronaldo', '2014 Panini Prizm World Cup #161 Cristiano Ronaldo Silver', '2014 Panini Prizm World Cup Cristiano Ronaldo 161 Silver', ['2014', 'prizm', 'ronaldo', '161', 'silver'], [...graded, 'stars', 'captain'], 288, 840, 5826, 170, 117, 25, 'Low'),
  T('t6', 'lionel-messi', '2014 Panini Prizm World Cup #12 Lionel Messi Silver', '2014 Panini Prizm World Cup Lionel Messi 12 Silver', ['2014', 'prizm', 'messi', '12', 'silver'], [...graded, 'stars', 'captain'], 810, 2499, 11100, 182, 112, 38, 'Low'),
  T('t7', 'erling-haaland', '2019-20 Topps Chrome UCL #74 Erling Haaland RC (base)', '2019-20 Topps Chrome Champions League Erling Haaland 74 RC', ['2019', 'chrome', 'haaland', '74'], [...graded, ...colors, 'sapphire', 'auto'], 138, 220, 405, null, null, null, 'Medium'),
  T('t8', 'lamine-yamal', '2023-24 Topps Chrome UCC #64 Lamine Yamal Refractor RC', '2023-24 Topps Chrome UCC Lamine Yamal 64 Refractor', ['2023', 'chrome', 'yamal', '64', 'refractor'], [...graded, 'red', 'blue', 'green', 'orange', 'gold', 'purple', 'pink', 'black', 'sapphire', 'auto'], 345, 335, 1800, null, null, null, 'Low'),
];
const now = Date.now(), h = (n) => new Date(now + n * 3600e3).toISOString(), seen = new Date().toISOString();
let seq = 0;
const L = (actionId, title, priceUSD, auctionEndsInH) => ({ externalId: 'v1|' + (110000000000 + (++seq)) + '|0', title, priceUSD, url: 'https://www.ebay.com/itm/' + (110000000000 + seq), actionId, lastSeenAt: seen, soldAt: null,
  rawData: auctionEndsInH ? { isAuction: true, isBIN: false, itemEndDate: h(auctionEndsInH) } : { isAuction: false, isBIN: true, acceptsOffers: true } });
const listings = [
  L('cristiano-ronaldo', '2014 Panini Prizm World Cup #161 Cristiano Ronaldo Portugal', 31, 5),
  L('cristiano-ronaldo', '2014 Panini Prizm World Cup Cristiano Ronaldo #161 PSA 9', 92, 3), // graded: excluded
  L('cristiano-ronaldo', '2014 Panini Prizm World Cup Cristiano Ronaldo #161 Silver Prizm', 265, 20),
  L('lionel-messi', '2014 Panini Prizm World Cup Lionel Messi #12 Argentina', 58, null),
  L('lionel-messi', '2014 Prizm World Cup Messi 12 base card', 64, null),
  L('lionel-messi', '2014 Panini Prizm Lionel Messi #12 WC', 71, null),
  L('lamine-yamal', '2023-24 Topps Chrome UEFA Club Competitions Lamine Yamal #64 RC', 39, 9),
  L('kylian-mbappe', '2018 Panini Prizm World Cup Kylian Mbappé #80 Rookie', 55, null),
  L('erling-haaland', '2019-20 Topps Chrome UCL Erling Haaland #74 RC Rookie', 128, 30),
];
for (const f of forms) { f.asOf = '2026-10-16'; f.approved = ['lamine-yamal', 'erling-haaland', 'kylian-mbappe'].includes(f.actionId); }
const ownSubs = [...Array(3).fill({ grade: '10' }), { grade: '9' }, ...Array(6).fill({ grade: '8' })];
const assumptions = [{ key: 'fee_to_grade_a_raw_in_hand_card', value: 32.99 }, { key: 'snipe_gem_haircut', value: 0.6 }, { key: 'snipe_budget', value: 100 }];
fs.writeFileSync(process.argv[2], JSON.stringify({ targets, forms, listings, assumptions, ownSubs, bids: [] }));
