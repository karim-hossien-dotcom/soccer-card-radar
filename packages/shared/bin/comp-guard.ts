// comp-guard CLI: `pnpm -s --filter @soccer-card-radar/shared comp-guard <input.json>`
// or `node packages/shared/bin/comp-guard.ts <input.json>`. Prints { ok, errors, warnings } as JSON.
// Exit 0 when ok, 1 when not ok (the CardComp is not written), 2 on usage, read or parse errors.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compGuardFromJson } from "../src/comp-guard.ts";

const fail = (error: string) => {
  process.stdout.write(JSON.stringify({ error }) + "\n");
  process.exit(2);
};

const arg = process.argv[2];
if (!arg) fail("usage: comp-guard <input.json>");
// pnpm runs scripts in the package dir; resolve against the caller's cwd.
const file = resolve(process.env.INIT_CWD ?? process.cwd(), arg!);
let json: unknown;
try {
  json = JSON.parse(readFileSync(file, "utf8"));
} catch (e) {
  fail(`cannot read ${file}: ${e instanceof Error ? e.message : String(e)}`);
}
const result = compGuardFromJson(json);
process.stdout.write(JSON.stringify(result, null, 2) + "\n");
process.exit(result.ok ? 0 : 1);
