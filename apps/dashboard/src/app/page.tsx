import { supabase } from "@soccer-card-radar/db";

export default async function Home() {
  const { data: entities, error } = await supabase
    .from("TrackedEntity")
    .select("*")
    .eq("active", true)
    .order("createdAt", { ascending: false });

  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Soccer Card Radar</h1>
      <p>Tracking {entities?.length ?? 0} entities</p>
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
      <ul>
        {entities?.map((e) => (
          <li key={e.id}>
            <strong>{e.player}</strong> ({e.yearMin}–{e.yearMax}) —{" "}
            {e.setKeywords.join(", ")}
          </li>
        ))}
      </ul>
    </main>
  );
}
