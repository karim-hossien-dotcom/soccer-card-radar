import { supabase } from "@soccer-card-radar/db";
import { fixtureMode } from "./collection/load";
import { latestRuns, type JobRunRow } from "@/lib/job-runs";
import { openItems, type OpenItemRow } from "@/lib/open-items";
import LatestRuns from "./latest-runs";

// J3: Radar home = latest result of each scheduled job (read-only). Replaces the old redirect to /snipe.
export const dynamic = "force-dynamic";

const COLS = 'job, "ranAt", "finishedAt", status, "openCount", summary, "reportPath", changes, "photoList"';

async function loadJobRuns(): Promise<JobRunRow[]> {
  if (fixtureMode()) {
    const { readFile } = await import("node:fs/promises");
    return (JSON.parse(await readFile(process.env.COLLECTION_FIXTURE!, "utf8")).jobRuns ?? []) as JobRunRow[];
  }
  const res = await Promise.all((["prices", "players", "photos"] as const).map((job) =>
    supabase.from("JobRun").select(COLS).eq("job", job).order("ranAt", { ascending: false }).limit(1)));
  for (const r of res) if (r.error) throw new Error(r.error.message);
  return res.flatMap((r) => (r.data ?? []) as JobRunRow[]);
}

const OPEN_COLS = 'id, job, "cardId", title, reason, "firstSeen", "lastSeen", "closedAt", "closedHow"';

// PC3: open items load on their own, so a missing OpenItem table (migration not yet applied) only affects that block.
async function loadOpenItems(): Promise<OpenItemRow[]> {
  if (fixtureMode()) {
    const { readFile } = await import("node:fs/promises");
    return (JSON.parse(await readFile(process.env.COLLECTION_FIXTURE!, "utf8")).openItems ?? []) as OpenItemRow[];
  }
  const { data, error } = await supabase.from("OpenItem").select(OPEN_COLS).is("closedAt", null).order("firstSeen", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as OpenItemRow[];
}

export default async function Home() {
  try {
    const panels = latestRuns(await loadJobRuns());
    let open: OpenItemRow[] = [], openError: string | null = null;
    try { open = await loadOpenItems(); } catch (e) { openError = (e as Error).message; }
    return (
      <>
        <header className="page-head">
          <h1>Radar</h1>
          <p>Latest result of each scheduled job, and items still open.</p>
        </header>
        <LatestRuns panels={panels} openItems={openItems(open, new Date())} openError={openError} />
      </>
    );
  } catch (e) {
    return <p className="notice">Couldn&apos;t load job runs: {(e as Error).message}</p>;
  }
}
