import type { GradingData, CentCheck } from "./load";
import { centeringGrade, fmtSplit } from "@/lib/borders";
import s from "./grading.module.css";
import CheckPanel from "./check-panel";
import GradePicker from "./grade-picker";
import Scan from "./scanner";

const usd = (n: number | null | undefined, d = 0) =>
  n === null || n === undefined ? "—" : n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: d, minimumFractionDigits: d });
const signed = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${n >= 0 ? "+" : "−"}${usd(Math.abs(n))}`);
const tone = (n: number | null | undefined) => (n === null || n === undefined ? undefined : n >= 0 ? "gain" : "loss");

function CentChecks({ checks }: { checks: CentCheck[] }) {
  if (!checks.length) return null;
  const pct = (x: number | null) => (x === null ? "—" : fmtSplit(x));
  return (
    <section aria-labelledby="cal-h">
      <h2 id="cal-h">Centering checks</h2>
      <p className="muted">Lines you confirmed on scans linked to a card. When PSA grades the card, its grade shows here next to what the centering alone allowed: that is how the grader gets calibrated.</p>
      <div className="sheet-wrap">
        <table className="sheet" aria-label="Centering checks">
          <thead><tr><th scope="col">Card</th><th scope="col">Side</th><th scope="col">L/R</th><th scope="col">T/B</th><th scope="col">Centering allows</th><th scope="col">PSA grade</th><th scope="col">Saved</th></tr></thead>
          <tbody>
            {checks.map((c) => {
              const worst = Math.max(c.lr ?? 0.5, c.tb ?? 0.5);
              const allows = c.lr === null && c.tb === null ? "—" : `PSA ${centeringGrade(worst, c.side === "back").psa}`;
              return (
                <tr key={c.cardId + c.side}>
                  <td style={{ minWidth: 200 }}>{c.title}</td><td>{c.side === "front" ? "Front" : "Back"}</td><td>{pct(c.lr)}</td><td>{pct(c.tb)}</td>
                  <td>{allows}</td>
                  <td>{c.grade ?? (c.status === "at_grader" ? "At PSA" : "Not graded yet")}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{c.at}{c.adjusted ? " · adjusted" : ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function GradingView({ open, back, backTotals: t, vault, listings, checks }: GradingData) {
  const atPsa = open.reduce((n, x) => n + x.cards.length, 0);
  return (
    <>
      <header className="page-head">
        <h1>Grading</h1>
        <p>Pick cards, press Grade.</p>
      </header>

      <section aria-label="Check cards">
        <div className={s.scanRow}><Scan /><span>For a card in your Vault, use Scan on its tile below: the result is saved to that card.</span></div>
        <GradePicker vault={vault} listings={listings} />
        <details className={s.upload}>
          <summary>Check your own photo instead</summary>
          <CheckPanel />
        </details>
      </section>

      <CentChecks checks={checks} />

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
