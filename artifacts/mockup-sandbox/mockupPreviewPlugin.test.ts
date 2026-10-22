import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { mockupPreviewPlugin } from "./mockupPreviewPlugin.ts";

test("discovers nested TSX previews while excluding private and non-TSX files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "mockup-preview-"));
  try {
    for (const file of [
      "Card.tsx",
      "nested/Panel.tsx",
      "_Private.tsx",
      "_hidden/Hidden.tsx",
      "nested/_private/Hidden.tsx",
      "nested/_Private.tsx",
      "notes.ts",
      ".hidden.tsx",
    ]) {
      const target = path.join(root, "src/components/mockups", file);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, "export default function Preview() { return null; }");
    }

    const plugin = mockupPreviewPlugin();
    assert.equal(typeof plugin.configResolved, "function");
    assert.equal(typeof plugin.buildStart, "function");
    // Only root is used by this plugin's config hook.
    await (plugin.configResolved as Function)({ root });
    await (plugin.buildStart as Function)();

    const generated = await readFile(
      path.join(root, "src/.generated/mockup-components.ts"),
      "utf8",
    );
    assert.match(generated, /"\.\/components\/mockups\/Card\.tsx"/);
    assert.match(generated, /"\.\/components\/mockups\/nested\/Panel\.tsx"/);
    assert.match(generated, /import\("\.\.\/components\/mockups\/Card\.tsx"\)/);
    assert.equal((generated.match(/=> import\(/g) ?? []).length, 2);
    assert.doesNotMatch(generated, /Private|Hidden|notes|\.hidden/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
