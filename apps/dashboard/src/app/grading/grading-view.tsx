import type { GradingData } from "./load";
import s from "./grading.module.css";
import CheckPanel from "./check-panel";
import GradePicker from "./grade-picker";
import Scan from "./scanner";

const usd = (n: number | null | undefined, d = 0) =>
  n === null || n === undefined ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const signed = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`);
const tone = (n: number | null | undefined) => (n === null || n === undefined ? undefined : n >= 0 ? "gain" : "loss");

export default function GradingView({ open, back, backTotals: t, vault, listings }: GradingData) {
  const atPsa = open.reduce((n, x) => n + x.cards.length, 0);
  return (
    <>
      <header className="page-head">
        <h1>Grading</h1>
        <p>Pick cards, press Grade.</p>
      </header>

      <section aria-label="Check cards">
        <div className={s.scanRow}><Scan /><span>On your phone: point at a card, it captures front and back and checks them.</span></div>
        <GradePicker vault={vault} listings={listings} />
        <details className={s.upload}>
          <summary>Check your own photo instead</summary>
          <CheckPanel />
        </details>
      </section>

      <section aria-labelledby="open-h">
        <h2 className="section" id="open-h">At PSA</h2>
        <p className={s.basis}>{atPsa} cards in {open.length} open submission{open.length === 1 ? "" : "s"}. Cost includes the fee.</p>
        {open.map((x) => (
          <details key={x.id} className={s.sub}>
            <summary className={s.subHead}>
              <div><span className={s.chev}>▶</span> <b>{x.grader} {x.id}</b> <span className="muted">{x.serviceLevel ?? ""}</span><span className={s.small}>{x.status ?? "—"}{x.arrivedOn ? `, arrived ${x.arrivedOn}` : ""}{x.estComplete ? `, est. ${x.estComplete}` : ""}</span></div>
              <div><span className={s.lbl}>Cards</span><span className={s.fig}>{x.cards.length}</span></div>
              <div><span className={s.lbl}>Cost in</span><span className={s.fig}>{usd(x.cost)}</span></div>
              <div><span className={s.lbl}>If all PSA 9</span><span className={s.fig}>{usd(x.if9)}</span>{x.priced < x.cards.length && <span className={s.small}>{x.priced} of {x.cards.length} priced</span>}</div>
              <div><span className={s.lbl}>If all PSA 10</span><span className={s.fig}>{usd(x.if10)}</span></div>
            </summary>
            {x.cards.length > 0 ? (
              <div className="sheet-wrap">
                <table className="sheet" aria-label={`Cards in ${x.id}`}>
                  <thead><tr><th>Card</th><th className="num">Cost</th><th className="num">PSA 9</th><th className="num">PSA 10</th><th className={`num ${s.hideM}`}>Net at 9</th></tr></thead>
                  <tbody>
                    {x.cards.sort((a, b) => (b.psa10 ?? 0) - (a.psa10 ?? 0)).map((c) => (
                      <tr key={c.id}>
                        <td><span className={s.player}>{c.player}</span><div className={s.card}>{c.item}</div></td>
                        <td className="num">{usd(c.cost, 2)}</td>
                        <td className="num">{usd(c.psa9)}{c.estimated && <span className={s.small}>est.</span>}</td>
                        <td className="num">{usd(c.psa10)}</td>
                        <td className={`num ${s.hideM}`}><span className={tone(c.net9)}>{signed(c.net9)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className={s.basis}>No cards linked to this submission in the Vault.</p>}
          </details>
        ))}
        {open.length === 0 && <p className="serif muted">Nothing at PSA.</p>}
      </section>

      <section aria-labelledby="back-h">
        <h2 className="section" id="back-h">Back from PSA</h2>
        <div className={s.kpis}>
          <span>{t.grades.map(([g, n]) => `${g}: ${n}`).join(" · ")}</span>
          <span>Cost <b>{usd(t.cost)}</b></span>
          <span>Value now <b>{usd(t.value)}</b></span>
          <span>Gain or loss <b className={tone(t.gain)}>{signed(t.gain)}</b></span>
        </div>
        <div className="sheet-wrap">
          <table className="sheet" aria-label="Graded and back">
            <thead><tr><th>Card</th><th>Grade</th><th className="num">Cost</th><th className="num">Value now</th><th className="num">Gain</th><th className={s.hideM}>Order</th></tr></thead>
            <tbody>
              {back.map((c) => (
                <tr key={c.id}>
                  <td><span className={s.player}>{c.player}</span><div className={s.card}>{c.item}</div></td>
                  <td style={{ whiteSpace: "nowrap" }}>{c.cracked ? <>Cracked<span className={s.small}>raw again</span></> : c.gradeLabel}</td>
                  <td className="num">{usd(c.cost, 2)}</td>
                  <td className="num">{usd(c.valueNow)}</td>
                  <td className="num"><span className={tone(c.gain)}>{signed(c.gain)}</span></td>
                  <td className={`${s.hideM} muted`}>{c.submissionId}</td>
                </tr>
              ))}
              {back.length === 0 && <tr><td colSpan={6} className="serif muted">Nothing back yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

    </>
  );
}
