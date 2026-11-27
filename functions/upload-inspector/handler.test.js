import test from "node:test";
import assert from "node:assert/strict";
import { createInspectorHandler } from "./handler.js";
import { inspect } from "./signatures.js";

const silent = { info() {}, warn() {}, error() {} };
const finalized = (name, size = 100) => ({ data: { bucket: "uploads", name, size: String(size) } });

test("recognises real files by their first bytes", () => {
  assert.equal(inspect("materials/a.pdf", Buffer.from("%PDF-1.7\n")), "ok");
  assert.equal(inspect("a.PNG", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "ok");
  assert.equal(inspect("a.docx", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])), "ok");
  assert.equal(inspect("a.mp4", Buffer.from([0, 0, 0, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d])), "ok");
  assert.equal(inspect("a.webp", Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")])), "ok");
});

test("flags content that does not match the extension", () => {
  assert.equal(inspect("a.pdf", Buffer.from("MZ\x90\x00")), "mismatch"); // Windows executable
  assert.equal(inspect("a.jpg", Buffer.from("<html><script>")), "mismatch");
  assert.equal(inspect("a.wav", Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")])), "mismatch");
});

test("leaves text formats unchecked", () => {
  assert.equal(inspect("data.csv", Buffer.from("name,email")), "unchecked");
});

test("moves a disguised file to quarantine", async () => {
  const moves = [];
  const handle = createInspectorHandler({
    readHead: async () => Buffer.from("MZ\x90\x00"),
    move: async (bucket, name, target) => moves.push({ bucket, name, target }),
    log: silent,
  });

  await handle(finalized("materials/12/report.pdf"));

  assert.deepEqual(moves, [{ bucket: "uploads", name: "materials/12/report.pdf", target: "quarantine/materials/12/report.pdf" }]);
});

test("keeps genuine files and ignores its own quarantine", async () => {
  let reads = 0;
  const moves = [];
  const handle = createInspectorHandler({
    readHead: async () => ((reads += 1), Buffer.from("%PDF-1.4")),
    move: async (...args) => moves.push(args),
    log: silent,
  });

  await handle(finalized("materials/12/report.pdf"));
  await handle(finalized("quarantine/materials/12/other.pdf"));

  assert.equal(reads, 1);
  assert.equal(moves.length, 0);
});
