// Pure logic of the exam result mailer: no SMTP, no Cloud Storage. index.js wires the real
// dependencies; tests pass fakes.

/** A message that will never succeed (bad JSON, no address). Acknowledge it instead of retrying. */
export class PermanentError extends Error {}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Reads the outbox payload and event id from a Pub/Sub CloudEvent. */
export function parseResultEvent(cloudEvent) {
  const message = cloudEvent?.data?.message;
  if (!message?.data) throw new PermanentError("Pub/Sub message has no data");

  let payload;
  try {
    payload = JSON.parse(Buffer.from(message.data, "base64").toString("utf8"));
  } catch {
    throw new PermanentError("Message data is not JSON");
  }
  if (typeof payload.studentEmail !== "string" || !EMAIL.test(payload.studentEmail)) {
    throw new PermanentError("Message has no valid studentEmail");
  }
  if (typeof payload.examTitle !== "string" || !payload.examTitle.trim()) {
    throw new PermanentError("Message has no examTitle");
  }

  const eventId = message.attributes?.eventId || `exam.result_ready:${payload.attemptId}`;
  return { eventId, payload };
}

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Indonesian e-mail: the platform is used by Indonesian schools. */
export function renderResultEmail(payload, appUrl) {
  const name = payload.studentName || "Siswa";
  const title = payload.examTitle;
  const subject = `Hasil ujian: ${title}`;

  const lines = [`Halo ${name},`, "", `Ujian "${title}" sudah selesai dinilai.`];
  if (payload.showScore) {
    lines.push(`Nilai kamu: ${payload.score} (batas lulus ${payload.passingScore}).`);
    lines.push(payload.passed ? "Selamat, kamu lulus." : "Kamu belum mencapai batas lulus.");
  } else {
    lines.push("Gurumu belum menampilkan nilai untuk ujian ini.");
  }
  if (appUrl) lines.push("", `Lihat detailnya di ${appUrl}`);
  lines.push("", "Email ini dikirim otomatis, mohon tidak dibalas.");

  const text = lines.join("\n");
  const html = lines.map((line) => (line ? `<p>${escapeHtml(line)}</p>` : "")).join("\n");
  return { subject, text, html };
}

/**
 * Builds the CloudEvent handler.
 *
 * Pub/Sub delivers at least once, and the outbox can publish an event twice after a crash. The handler
 * claims the event id first (an object created only if it does not exist yet), sends the e-mail, and
 * releases the claim if sending fails so the retry can try again.
 *
 * @param {object} deps
 * @param {(eventId: string) => Promise<boolean>} deps.claim   true if this delivery owns the event
 * @param {(eventId: string) => Promise<void>} deps.release
 * @param {(mail: {to: string, subject: string, text: string, html: string}) => Promise<void>} deps.send
 * @param {string} [deps.appUrl]
 * @param {{info: Function, warn: Function, error: Function}} [deps.log]
 */
export function createMailerHandler({ claim, release, send, appUrl, log = console }) {
  return async function handle(cloudEvent) {
    let event;
    try {
      event = parseResultEvent(cloudEvent);
    } catch (error) {
      if (error instanceof PermanentError) {
        log.error(JSON.stringify({ severity: "ERROR", message: `Dropping exam result message: ${error.message}` }));
        return; // acknowledged: retrying cannot fix it
      }
      throw error;
    }

    if (!(await claim(event.eventId))) {
      log.info(JSON.stringify({ severity: "INFO", message: "Duplicate delivery skipped", eventId: event.eventId }));
      return;
    }

    const mail = renderResultEmail(event.payload, appUrl);
    try {
      await send({ to: event.payload.studentEmail, ...mail });
    } catch (error) {
      await release(event.eventId);
      throw error; // Pub/Sub retries the delivery
    }
    // No address in the log: it is personal data and Cloud Logging keeps it for weeks.
    log.info(JSON.stringify({ severity: "INFO", message: "Exam result e-mail sent", eventId: event.eventId }));
  };
}
