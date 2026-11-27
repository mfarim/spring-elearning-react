import test from "node:test";
import assert from "node:assert/strict";
import { buildExportRequest, createExportHandler } from "./handler.js";

const config = { project: "demo", instance: "elearning-db", database: "elearning", bucket: "demo-ops" };
const silent = { info() {}, warn() {}, error() {} };

function fakeResponse() {
  const res = { statusCode: 0, body: null };
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (body) => ((res.body = body), res);
  res.send = (body) => ((res.body = body), res);
  return res;
}

test("names the export after the day, gzipped", () => {
  const request = buildExportRequest(config, new Date("2026-11-15T19:00:00Z"));
  assert.equal(request.url, "https://sqladmin.googleapis.com/v1/projects/demo/instances/elearning-db/export");
  assert.equal(request.data.exportContext.uri, "gs://demo-ops/sql-exports/elearning-2026-11-15.sql.gz");
  assert.deepEqual(request.data.exportContext.databases, ["elearning"]);
});

test("refuses to run with missing configuration", () => {
  assert.throws(() => buildExportRequest({ ...config, bucket: "" }, new Date()), /Missing configuration: bucket/);
});

test("starts the export and returns the operation", async () => {
  const calls = [];
  const handle = createExportHandler({
    request: async (options) => (calls.push(options), { data: { name: "op-123" } }),
    config,
    now: () => new Date("2026-11-15T19:00:00Z"),
    log: silent,
  });
  const res = fakeResponse();

  await handle({ method: "POST" }, res);

  assert.equal(res.statusCode, 202);
  assert.equal(res.body.operation, "op-123");
  assert.equal(calls.length, 1);
});

test("reports a clash with a running backup as 409 so Scheduler retries", async () => {
  const handle = createExportHandler({
    request: async () => {
      const error = new Error("Operation in progress");
      error.response = { status: 409 };
      throw error;
    },
    config,
    log: silent,
  });
  const res = fakeResponse();

  await handle({ method: "POST" }, res);

  assert.equal(res.statusCode, 409);
});

test("only accepts POST", async () => {
  const handle = createExportHandler({ request: async () => ({ data: {} }), config, log: silent });
  const res = fakeResponse();
  await handle({ method: "GET" }, res);
  assert.equal(res.statusCode, 405);
});
