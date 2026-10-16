# Design: Matchday programme (UI-1, 2026-10-16)

Process: anthropics/skills `frontend-design` (plan, review against generic defaults, build, screenshot critique).

## Subject
Karim's card desk: scout deals (Rookies, Stars, Legends), spot dips, track the Vault. One user, checks it weekly, decides what to buy, grade or sell.

## Plan
- Colour (globals.css): pitch #0E3B2E (masthead, pitch), chalk #F4F1EA (pages), ink #14201B, rule #D9D3C4, gold #D4A017 (active tab and tier-S ring only; too light for text on chalk), gain #1F7A4D, loss #B42318.
- Type: Archivo variable (self-hosted via @fontsource, width axis) for UI, headings and numbers with tabular figures; Source Serif 4 for prose (intros, card descriptions, notes). No monospace, no all-caps.
- Layout: a pitch-green masthead like a programme cover band, then chalk pages. Data reads as team sheets: hairline-ruled tables, a 2px ink rule over headers, numbered rows only where the order is a ranking (Dips). Card photos sit on a chalk mat with captions below, no boxes.
- Principles: colour comes from the cards; the interface stays quiet. One bold element per page (the masthead; the pitch on scout pages). Structure encodes meaning: rules separate rows, the left gold bar marks something due.

## Review vs generic defaults
- Risk: chalk + serif reads like the "cream, serif, terracotta" cluster. Changed: serif is limited to prose, all UI and numbers are wide Archivo, accents are pitch green and gold, not terracotta.
- Removed from the old look: near-black with red/gold glow, Bebas Neue, tracked all-caps labels, monospace data, identical bordered rounded boxes, middle-dot meta strings, arrows on links, bounce on hover.

## Notes for later passes
- The Vault scoreboard sits directly above the grid because it reflects the current filters.
- Phone pitch uses a taller field (Lines h=92) so tokens don't collide; markings are drawn per height so the centre circle stays round.
- Card descriptions come from the workbook in capitals; left as data.
