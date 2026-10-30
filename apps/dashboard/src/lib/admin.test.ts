import { test } from "node:test";
import assert from "node:assert/strict";
import { requireAdmin, sameSite } from "./admin.ts";

const req = (h: Record<string, string>) => new Request("https://cards.test/api/x", { method: "POST", headers: h });

test("same-site pages pass without a token; other sites and bare scripts are refused", () => {
  process.env.ADMIN_TOKEN = "s3cret";
  assert.equal(requireAdmin(req({ host: "cards.test", origin: "https://cards.test" })), null);
  assert.equal(requireAdmin(req({ host: "cards.test", referer: "https://cards.test/snipe" })), null);
  assert.equal(requireAdmin(req({ host: "cards.test", origin: "https://evil.test" }))?.status, 403);
  assert.equal(requireAdmin(req({ host: "cards.test" }))?.status, 403);
  assert.equal(requireAdmin(req({ host: "cards.test", "x-admin-token": "s3cret" })), null); // scripts keep working
  assert.equal(requireAdmin(req({ host: "cards.test", "x-admin-token": "nope" }))?.status, 403);
  assert.equal(sameSite(req({ host: "cards.test", origin: "not a url" })), false);
});
