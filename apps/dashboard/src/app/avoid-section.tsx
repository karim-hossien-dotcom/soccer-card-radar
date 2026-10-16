import type { ResearchAction, Lane } from "./research-engine";

/** Players to sell or skip in this lane: a short team sheet with the reason. */
export default function AvoidSection({ actions, lane }: { actions: ResearchAction[]; lane: Lane }) {
  const sells = actions.filter((a) => a.signal === "SELL" && a.lane === lane);
  if (sells.length === 0) return null;
  return (
    <section aria-labelledby="avoid-h">
      <h2 className="section" id="avoid-h">Sell or avoid</h2>
      <div className="sheet-wrap">
        <table className="sheet">
          <tbody>
            {sells.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 650, whiteSpace: "nowrap" }}>{a.player}</td>
                <td className="serif muted">{a.reasoning}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
