const STALE_HOURS = 48; // matches the deal freshness window in fetch-deals / dips

// Listing.lastSeenAt is "timestamp without time zone" written in UTC; read it as UTC whatever the server's TZ.
const toDate = (s: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(s) ? s : s + "Z");
export const isFresh = (listingsAt: string | null) => !!listingsAt && Date.now() - toDate(listingsAt).getTime() <= STALE_HOURS * 3600_000;

const day = (iso: string) => toDate(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
function ago(iso: string, now: number): string {
  const h = Math.floor((now - toDate(iso).getTime()) / 3600_000);
  if (h < 1) return "less than an hour ago";
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"} ago`;
  return `${Math.floor(h / 24)} days ago`;
}

/** S1: tells Karim how fresh the eBay data behind this page is, and why it's empty when the scan has stopped. */
export default function Freshness({ listingsAt, soldAt }: { listingsAt: string | null; soldAt?: string | null }) {
  const now = Date.now();
  const stale = !isFresh(listingsAt);
  return (
    <>
      {stale ? (
        <p className="notice">
          {listingsAt ? `eBay listings were last checked on ${day(listingsAt)}.` : "eBay listings have never been checked."} Deals older than two days are hidden, so this page stays empty until the daily scan runs again.
        </p>
      ) : (
        <p className="muted" style={{ fontSize: 13, marginTop: -14, marginBottom: 18 }}>
          eBay listings checked {ago(listingsAt!, now)}.
          {soldAt !== undefined && (soldAt ? ` Sold prices as of ${day(soldAt)}.` : " No sold prices yet.")}
        </p>
      )}
    </>
  );
}
