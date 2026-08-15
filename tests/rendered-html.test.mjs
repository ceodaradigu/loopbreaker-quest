import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Loopbreaker product surface", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Loopbreaker — Turn loops into songs<\/title>/i);
  assert.match(html, /YOUR LOOP IS/);
  assert.match(html, /FOUR MISSIONS/);
  assert.match(html, /VARIATION FORGE/);
  assert.match(html, /WRITES ONLY ON COMMAND/);
  assert.doesNotMatch(html, /Your site is taking shape|react-loading-skeleton/i);
});

test("keeps the Nexus write explicit and non-destructive", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(source, /scope:\s*"project:write"/);
  assert.match(source, /transaction\.create\("tonematrix"/);
  assert.match(source, /transaction\.create\("tonematrixPattern"/);
  assert.match(source, /transaction\.create\("desktopAudioCable"/);
  assert.match(source, /Existing music stays untouched\./);
  assert.doesNotMatch(source, /deleteEntity|removeEntity/i);
});

test("ships deterministic strategy data for all three variation paths", async () => {
  const source = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  for (const id of ["question", "lift", "space"]) {
    assert.match(source, new RegExp(`id: "${id}"`));
  }
  assert.match(source, /function calculateMomentum/);
  assert.match(source, /function buildMissions/);
});
