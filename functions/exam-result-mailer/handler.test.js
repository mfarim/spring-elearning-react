import test from "node:test";
import assert from "node:assert/strict";
import { createMailerHandler, parseResultEvent, renderResultEmail } from "./handler.js";

const event = (payload, attributes = { eventId: "exam.result_ready:500" }) => ({
  data: { message: { data: Buffer.from(JSON.stringify(payload)).toString("base64"), attributes } },
});
const base = { attemptId: 500, examTitle: "Quiz 1", studentName: "Andi", studentEmail: "andi@siswa.id" };
const silent = { info() {}, warn() {}, error() {} };

test("parses the outbox payload and the event id", () => {
  const { eventId, payload } = parseResultEvent(event(base));
  assert.equal(eventId, "exam.result_ready:500");
  assert.equal(payload.studentEmail, "andi@siswa.id");
});

test("shows the score only when the teacher allows it", () => {
  const shown = renderResultEmail({ ...base, showScore: true, score: 85, passed: true, passingScore: 70 });
  assert.match(shown.text, /Nilai kamu: 85 \(batas lulus 70\)/);
  assert.match(shown.text, /lulus/);

  const hidden = renderResultEmail({ ...base, showScore: false, score: 85 });
  assert.doesNotMatch(hidden.text, /85/);
  assert.match(hidden.text, /belum menampilkan nilai/);
});

test("escapes HTML in teacher-provided text", () => {
  const { html } = renderResultEmail({ ...base, examTitle: "<script>alert(1)</script>" });
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
});

test("sends once per event id even when Pub/Sub delivers twice", async () => {
  const claimed = new Set();
  const sent = [];
  const handle = createMailerHandler({
    claim: async (id) => (claimed.has(id) ? false : (claimed.add(id), true)),
    release: async (id) => claimed.delete(id),
    send: async (mail) => sent.push(mail),
    log: silent,
  });

  await handle(event(base));
  await handle(event(base));

  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "andi@siswa.id");
  assert.equal(sent[0].subject, "Hasil ujian: Quiz 1");
});

test("releases the claim and rethrows when SMTP fails, so the retry can send", async () => {
  const claimed = new Set();
  let attempts = 0;
  const handle = createMailerHandler({
    claim: async (id) => (claimed.has(id) ? false : (claimed.add(id), true)),
    release: async (id) => claimed.delete(id),
    send: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error("SMTP timeout");
    },
    log: silent,
  });

  await assert.rejects(handle(event(base)), /SMTP timeout/);
  await handle(event(base));

  assert.equal(attempts, 2);
});

test("acknowledges malformed messages instead of retrying them forever", async () => {
  let sent = 0;
  const handle = createMailerHandler({
    claim: async () => true,
    release: async () => {},
    send: async () => (sent += 1),
    log: silent,
  });

  await handle(event({ ...base, studentEmail: "not-an-address" }));
  await handle({ data: { message: { data: Buffer.from("{oops").toString("base64") } } });

  assert.equal(sent, 0);
});
