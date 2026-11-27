// Nightly logical export of the Cloud SQL database to Cloud Storage.
//
// Why not only Cloud SQL's automated backups? Those belong to the instance: they restore into Cloud SQL
// and are tied to the instance's lifecycle. A .sql.gz in a bucket restores anywhere (a laptop, a VPS,
// another cloud) and its retention is set by a bucket lifecycle rule.
//
// Why a function and not Cloud Scheduler calling the Admin API directly? The file name has to change
// every night; a Scheduler job sends the same body every time.

/** gs:// URI of the export for a given date, e.g. gs://ops/sql-exports/elearning-2026-11-15.sql.gz */
export function exportUri(bucket, database, date) {
  const day = date.toISOString().slice(0, 10);
  // Cloud SQL compresses the export when the URI ends in .gz.
  return `gs://${bucket}/sql-exports/${database}-${day}.sql.gz`;
}

export function buildExportRequest({ project, instance, database, bucket }, date) {
  for (const [key, value] of Object.entries({ project, instance, database, bucket })) {
    if (!value) throw new Error(`Missing configuration: ${key}`);
  }
  const uri = exportUri(bucket, database, date);
  return {
    url: `https://sqladmin.googleapis.com/v1/projects/${project}/instances/${instance}/export`,
    method: "POST",
    data: {
      exportContext: {
        kind: "sql#exportContext",
        fileType: "SQL",
        uri,
        databases: [database],
      },
    },
    uri,
  };
}

/**
 * HTTP handler for Cloud Scheduler. The export runs asynchronously in Cloud SQL; the handler returns
 * the operation name. Cloud SQL runs one operation at a time per instance, so a clash with an
 * automated backup returns 409 and the Scheduler job retries later.
 *
 * @param {object} deps
 * @param {(request: object) => Promise<{data: {name: string}}>} deps.request authenticated Admin API call
 * @param {object} deps.config {project, instance, database, bucket}
 * @param {() => Date} [deps.now]
 */
export function createExportHandler({ request, config, now = () => new Date(), log = console }) {
  return async function handle(req, res) {
    if (req.method !== "POST") {
      res.status(405).send("Use POST");
      return;
    }
    const { url, method, data, uri } = buildExportRequest(config, now());
    try {
      const response = await request({ url, method, data });
      log.info(JSON.stringify({ severity: "INFO", message: "Cloud SQL export started", uri, operation: response.data.name }));
      res.status(202).json({ operation: response.data.name, uri });
    } catch (error) {
      const status = error.response?.status || 500;
      log.error(JSON.stringify({ severity: "ERROR", message: "Cloud SQL export failed to start", uri, status, detail: error.message }));
      // Non-2xx makes Cloud Scheduler retry according to the job's retry config.
      res.status(status === 409 ? 409 : 500).json({ error: "export failed to start", status });
    }
  };
}
