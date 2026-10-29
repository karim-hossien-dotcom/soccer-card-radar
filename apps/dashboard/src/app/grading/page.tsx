import { loadGrading } from "./load";
import GradingView from "./grading-view";

export const dynamic = "force-dynamic";

export default async function GradingPage() {
  try {
    return <GradingView {...await loadGrading()} />;
  } catch (e) {
    return <p className="notice">Couldn&apos;t load grading: {(e as Error).message}</p>;
  }
}
