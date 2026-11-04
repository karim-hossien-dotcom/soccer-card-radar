// Snipe countdown text. Both take an explicit `now` (ms) so the server render and the first client render use the same
// clock and React hydration doesn't see different text when a minute ticks over between them.

// Listing timestamps may be "timestamp without time zone" written in UTC: read zone-less ones as UTC.
const utc = (iso: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + "Z");

export const agoShort = (iso: string, now: number) => {
  const h = Math.floor((now - utc(iso).getTime()) / 3600_000);
  return h < 1 ? "just now" : h < 48 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`;
};

export const endsIn = (iso: string | null, now: number) => {
  if (!iso) return "";
  const m = Math.round((new Date(iso).getTime() - now) / 60000);
  return m < 60 ? `${m}m` : m < 2880 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${Math.floor(m / 1440)}d`;
};
