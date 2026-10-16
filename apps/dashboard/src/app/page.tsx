import { redirect } from "next/navigation";

// Rookies/Stars/Legends pages were retired (2026-10-16): their research was out of date. Snipe is home.
export default function Home() {
  redirect("/snipe");
}
