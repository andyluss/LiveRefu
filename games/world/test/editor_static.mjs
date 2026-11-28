#!/usr/bin/env node
// Editor v0.6 static contract: recursive schema form + R-016 + no external deps.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(ROOT, "web/editor.html"), "utf8");
const js = readFileSync(resolve(ROOT, "web/editor.js"), "utf8");
const css = readFileSync(resolve(ROOT, "web/editor.css"), "utf8");
assert.ok(html.includes("editor v0.6") || html.includes(">v0.6<"));
assert.ok(html.includes('id="schema-form"'));
assert.ok(js.includes("function renderSchemaForm"));
assert.ok(js.includes("schemaInput") && js.includes("Array.isArray"));
assert.ok(css.includes(".schema-group"));
assert.ok(html.includes('data-theme-choice="system"'));
assert.ok(!/https?:\/\//.test(html), "editor must not depend on external runtime assets");
console.log("editor static PASS (v0.6 recursive schema form)");
