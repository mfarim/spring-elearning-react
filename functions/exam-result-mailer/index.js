// Cloud Run function (Pub/Sub trigger): e-mails a student when their exam result is final.
//
// Env (SMTP_* come from Secret Manager, see deploy/gcp/40-functions.sh):
//   SMTP_HOST, SMTP_PORT (587 or 465; port 25 is blocked on Google Cloud), SMTP_USER, SMTP_PASS, SMTP_FROM
//   DEDUP_BUCKET  bucket for the "already sent" markers (a lifecycle rule deletes them after 30 days)
//   APP_URL       link shown in the e-mail

import functions from "@google-cloud/functions-framework";
import nodemailer from "nodemailer";
import { Storage } from "@google-cloud/storage";
import { createMailerHandler } from "./handler.js";

const storage = new Storage();
const dedup = storage.bucket(process.env.DEDUP_BUCKET);
const markerOf = (eventId) => dedup.file(`mailer-dedup/${encodeURIComponent(eventId)}`);

const port = Number(process.env.SMTP_PORT || 587);
const transport = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: port === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

functions.cloudEvent(
  "examResultMailer",
  createMailerHandler({
    // ifGenerationMatch: 0 = create only if the object does not exist; a second delivery gets HTTP 412.
    async claim(eventId) {
      try {
        await markerOf(eventId).save("", { preconditionOpts: { ifGenerationMatch: 0 } });
        return true;
      } catch (error) {
        if (error.code === 412) return false;
        throw error;
      }
    },
    async release(eventId) {
      await markerOf(eventId).delete({ ignoreNotFound: true });
    },
    async send(mail) {
      await transport.sendMail({ from: process.env.SMTP_FROM, ...mail });
    },
    appUrl: process.env.APP_URL,
  })
);
