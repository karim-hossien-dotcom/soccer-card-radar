// thin_blend CLI: `pnpm -s --filter @soccer-card-radar/shared thin-blend <input.json>`
// or `node packages/shared/bin/thin-blend.ts <input.json>`. Prints the result as JSON.
// Exit 0 on a result (including applies:false / value:null), 2 on usage, read or parse errors and on an input the
// engine refuses (a `purchase` signal: Karim's purchases are not a value signal).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { thinBlendFromJson } from "../src/thin-blend.ts";

const fail = (error: string) => {
  process.stdout.write(JSON.stringify({ error }) + "\n");
  process.exit(2);
};

const arg = process.argv[2];
if (!arg) fail("usage: thin-blend <input.json>");
// pnpm runs scripts in the package dir; resolve against the caller's cwd.
const file = resolve(process.env.INIT_CWD ?? process.cwd(), arg!);
let json: unknown;
try {
  json = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  fail(`cannot read ${file}: ${e instanceof Error ? e.message : String(e)}`);
}
const result = thinBlendFromJson(json);
const refused = result.applies ? result.excluded.find((e) => e.kind === "input" && e.reason.startsWith("error: ")) : undefined;
if (refused) fail(refused.reason.slice("error: ".length));
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
