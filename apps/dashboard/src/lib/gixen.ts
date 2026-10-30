/**
 * C3b: manual Gixen hand-off for an approved bid. Pure helpers that build text and links only:
 * no Gixen login, credentials, API call or bid placement anywhere.
 */
export const GIXEN_URL = "https://www.gixen.com/main/home_1.php";

/** eBay item number: Browse API ids look like "v1|123456789012|0"; plain ids pass through. */
export const ebayItemNumber = (externalId: string) => {
  const id = externalId.trim();
  return /^v\d+\|([^|]+)\|[^|]*$/.exec(id)?.[1] ?? id;
};

/** The max as typed into Gixen: "40", or "40.50" when it has cents. */
export const maxText = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** UTC basic format for Google Calendar: YYYYMMDDTHHMMSSZ. */
const calDate = (ms: number) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, "Z").replace(/[-:]/g, "");

/** Google Calendar event template: endsAt minus 15 min to endsAt. Null when endsAt is missing or invalid. */
export function reminderUrl(o: { card: string; maxBid: number; endsAt: string | null | undefined; url: string; itemNumber: string }): string | null {
  const end = o.endsAt ? Date.parse(o.endsAt) : NaN;
  if (!Number.isFinite(end)) return null;
  const max = `$${maxText(o.maxBid)}`;
  const text = `Snipe: ${o.card} max ${max}`;
  const details = `${o.url}\neBay item # ${o.itemNumber}\nMax ${max}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${calDate(end - 15 * 60_000)}/${calDate(end)}&details=${encodeURIComponent(details)}`;
}
