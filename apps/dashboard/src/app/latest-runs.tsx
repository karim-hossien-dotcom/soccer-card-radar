import { formatEt, type Change, type JobPanel } from "@/lib/job-runs";

// J3: server-rendered (no "use client"): times are formatted once on the server, so nothing can mismatch on hydration.
const KIND: Record<Change["kind"], string> = { value: "Value", card_added: "Card added", cost: "Cost", photo: "Photo", estimate: "Estimate" };
const show = (v: unknown) =>
  typeof v === "number" ? v.toLocaleString("en-US", { style: "currency", currency: "USD" }) : v === null || v === undefined || v === "" ? "—" : String(v);
const cardHref = (id: string) => `/collection?card=${encodeURIComponent(id)}`;

const panel = { background: "var(--surface)", border: "1px solid var(--rule)", borderRadius: "var(--radius)", boxShadow: "var(--shadow)", padding: "14px 16px", minWidth: 0 } as const;
const list = { margin: "6px 0 0", paddingLeft: 18, display: "grid", gap: 6, fontSize: "var(--t-sm)", overflowWrap: "anywhere" } as const;

export default function LatestRuns({ panels }: { panels: JobPanel[] }) {
  return (
    <section aria-label="Latest runs" style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))", alignItems: "start" }}>
      {panels.map(({ job, label, run, empty }) => (
        <article key={job} aria-label={label} style={panel}>
          <h2 style={{ fontSize: "var(--t-lg)", fontWeight: 750 }}>{label}</h2>
          {!run ? <p className="muted" style={{ marginTop: 6 }}>{empty}</p> : (
            <>
              <p style={{ marginTop: 6, fontWeight: 650 }} className={run.complete ? "gain" : "loss"}>{run.statusLine}</p>
              <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2 }}>Ran {formatEt(run.ranAt)}{run.finishedAt ? `, finished ${formatEt(run.finishedAt)}` : ""}</p>
              {run.summary && <p style={{ marginTop: 8, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{run.summary}</p>}
              <p style={{ marginTop: 8, fontSize: "var(--t-sm)" }}>{run.counts}{run.photoList.length ? `; ${run.photoList.length} to photograph` : ""}</p>
              {run.reportPath && <p className="muted" style={{ fontSize: "var(--t-sm)", marginTop: 2, overflowWrap: "anywhere" }}>Report: {run.reportPath}</p>}
              {run.changes.length > 0 && (
                <details className="notes" style={{ marginTop: 12 }}>
                  <summary>Changes ({run.changes.length})</summary>
                  <ul style={list}>
                    {run.changes.map((c, i) => (
                      <li key={i}>
                        <span className="muted">{KIND[c.kind]}: </span>
                        <a href={cardHref(c.cardId)}>{c.card}</a>
                        {("from" in c || "to" in c) && <> {show(c.from)} → {show(c.to)}</>}
                        {c.source && <span className="muted"> ({c.source})</span>}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
              {run.photoList.length > 0 && (
                <div style={{ marginTop: 12 }} aria-label="Take photo">
                  <h3 style={{ fontSize: "var(--t-sm)", fontWeight: 650 }}>Take photo</h3>
                  <ul style={list}>
                    {run.photoList.map((p, i) => (
                      <li key={i}><a href={cardHref(p.cardId)}>{p.card}</a> <span className="muted">({p.side}){p.reason ? `: ${p.reason}` : ""}</span></li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </article>
      ))}
    </section>
  );
}
