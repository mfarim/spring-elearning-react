// Cloud Run function (Eventarc trigger: google.cloud.storage.object.v1.finalized on the uploads bucket).
// Checks that each upload's first bytes match its extension; moves mismatches to quarantine/.

import functions from "@google-cloud/functions-framework";
import { Storage } from "@google-cloud/storage";
import { createInspectorHandler } from "./handler.js";

const storage = new Storage();

functions.cloudEvent(
  "uploadInspector",
  createInspectorHandler({
    async readHead(bucket, name, bytes) {
      const [head] = await storage.bucket(bucket).file(name).download({ start: 0, end: bytes - 1 });
      return head;
    },
    async move(bucket, name, target) {
      await storage.bucket(bucket).file(name).move(target);
    },
  })
);
