import { HEAD_BYTES, inspect } from "./signatures.js";

export const QUARANTINE_PREFIX = "quarantine/";

/**
 * Builds the handler for "object finalized" events on the uploads bucket.
 *
 * A file whose content does not match its extension (an executable renamed to .pdf, an HTML page
 * renamed to .jpg) is moved to quarantine/. The backend then answers 404 for it, and the move is
 * logged with severity WARNING so an alert can pick it up.
 *
 * @param {object} deps
 * @param {(bucket: string, name: string, bytes: number) => Promise<Buffer>} deps.readHead
 * @param {(bucket: string, name: string, target: string) => Promise<void>} deps.move
 */
export function createInspectorHandler({ readHead, move, log = console }) {
  return async function handle(cloudEvent) {
    const { bucket, name, size } = cloudEvent.data || {};
    if (!bucket || !name) return;
    // Our own move creates a new object: never inspect the quarantine.
    if (name.startsWith(QUARANTINE_PREFIX)) return;

    const head = Number(size) === 0 ? Buffer.alloc(0) : await readHead(bucket, name, HEAD_BYTES);
    const verdict = inspect(name, head);
    if (verdict !== "mismatch") {
      log.info(JSON.stringify({ severity: "INFO", message: `Upload ${verdict}`, object: name }));
      return;
    }

    const target = QUARANTINE_PREFIX + name;
    await move(bucket, name, target);
    log.warn(
      JSON.stringify({
        severity: "WARNING",
        message: "Upload content does not match its extension; moved to quarantine",
        object: name,
        quarantined: target,
        firstBytes: head.toString("hex"),
      })
    );
  };
}
