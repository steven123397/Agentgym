import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readProjectFile = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("baseline exposes the application mount point", async () => {
  const html = await readProjectFile("index.html");

  assert.match(html, /<main id="app"><\/main>/);
});

test("baseline loads the frontend entry module", async () => {
  const html = await readProjectFile("index.html");

  assert.match(html, /<script type="module" src="\/src\/main\.js"><\/script>/);
});