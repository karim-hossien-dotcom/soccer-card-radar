import { test } from "node:test";
import assert from "node:assert/strict";
import { sign, verify, checkLogin, safeNext, USER, MAX_AGE_S } from "./session.ts";

test("a session signed with the password verifies; another password or a tampered token doesn't", async () => {
  const t = await sign("correct horse");
  assert.ok(await verify(t, "correct horse"));
  assert.equal(await verify(t, "other"), false);
  const [u, exp, sig] = t.split(".");
  assert.equal(await verify(`${u}.${Number(exp) + 999}.${sig}`, "correct horse"), false);
  assert.equal(await verify(`someone.${exp}.${sig}`, "correct horse"), false);
  assert.equal(await verify(t, undefined), false);
  assert.equal(await verify(undefined, "correct horse"), false);
});

test("sessions expire after 30 days", async () => {
  const t = await sign("pw", 0);
  assert.ok(await verify(t, "pw", (MAX_AGE_S - 1) * 1000));
  assert.equal(await verify(t, "pw", (MAX_AGE_S + 1) * 1000), false);
});

test("login needs the exact user and password; no password set means nobody", async () => {
  assert.ok(await checkLogin(USER, "pw", "pw"));
  assert.equal(await checkLogin(USER, "pw ", "pw"), false);
  assert.equal(await checkLogin("karim", "pw", "pw"), false);
  assert.equal(await checkLogin(USER, "", undefined), false);
});

test("after login only same-site paths", () => {
  assert.equal(safeNext("/grading?x=1"), "/grading?x=1");
  for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "", null]) assert.equal(safeNext(bad), "/");
});
