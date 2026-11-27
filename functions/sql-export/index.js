// Cloud Run function (HTTP, invoked by Cloud Scheduler with an OIDC token; not public).
// Env: GCP_PROJECT, SQL_INSTANCE, SQL_DATABASE, EXPORT_BUCKET.
// The function's service account needs roles/cloudsql.viewer + cloudsql.instances.export
// (roles/cloudsql.editor or a custom role); the Cloud SQL instance's own service account needs
// write access to EXPORT_BUCKET. See deploy/gcp/40-functions.sh.

import functions from "@google-cloud/functions-framework";
import { GoogleAuth } from "google-auth-library";
import { createExportHandler } from "./handler.js";

const auth = new GoogleAuth({ scopes: ["https://www.googleapis.com/auth/sqlservice.admin"] });

functions.http(
  "sqlExport",
  createExportHandler({
    async request(options) {
      const client = await auth.getClient();
      return client.request(options);
    },
    config: {
      project: process.env.GCP_PROJECT,
      instance: process.env.SQL_INSTANCE,
      database: process.env.SQL_DATABASE,
      bucket: process.env.EXPORT_BUCKET,
    },
  })
);
