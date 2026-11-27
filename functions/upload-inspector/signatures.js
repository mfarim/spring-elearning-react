// File signatures ("magic bytes") for the extensions the backend accepts
// (FileStorageService.ALLOWED_EXTENSIONS). The backend only checks the name; this checks the content.

const bytes = (...values) => Buffer.from(values);
const ascii = (text) => Buffer.from(text, "ascii");

const startsWith = (prefix, offset = 0) => (head) =>
  head.length >= offset + prefix.length && head.subarray(offset, offset + prefix.length).equals(prefix);

const ZIP = startsWith(bytes(0x50, 0x4b, 0x03, 0x04)); // also .docx/.xlsx/.pptx
const EMPTY_ZIP = startsWith(bytes(0x50, 0x4b, 0x05, 0x06));
const OLE = startsWith(bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1)); // legacy .doc/.xls/.ppt
const riff = (format) => (head) => startsWith(ascii("RIFF"))(head) && startsWith(ascii(format), 8)(head);
const zipLike = (head) => ZIP(head) || EMPTY_ZIP(head);

/** Extension -> check. Text formats (.txt, .csv) have no signature and are not listed. */
export const SIGNATURES = {
  ".pdf": startsWith(ascii("%PDF-")),
  ".png": startsWith(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)),
  ".jpg": startsWith(bytes(0xff, 0xd8, 0xff)),
  ".jpeg": startsWith(bytes(0xff, 0xd8, 0xff)),
  ".gif": (head) => startsWith(ascii("GIF87a"))(head) || startsWith(ascii("GIF89a"))(head),
  ".webp": riff("WEBP"),
  ".zip": zipLike,
  ".docx": zipLike,
  ".xlsx": zipLike,
  ".pptx": zipLike,
  ".doc": OLE,
  ".xls": OLE,
  ".ppt": OLE,
  ".rar": startsWith(bytes(0x52, 0x61, 0x72, 0x21, 0x1a, 0x07)),
  ".7z": startsWith(bytes(0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c)),
  // ID3 tag, or an MPEG audio frame sync (11 set bits)
  ".mp3": (head) => startsWith(ascii("ID3"))(head) || (head.length >= 2 && head[0] === 0xff && (head[1] & 0xe0) === 0xe0),
  ".wav": riff("WAVE"),
  ".ogg": startsWith(ascii("OggS")),
  ".mp4": startsWith(ascii("ftyp"), 4),
  ".webm": startsWith(bytes(0x1a, 0x45, 0xdf, 0xa3)),
};

/** Bytes to read from the start of the object; enough for every check above. */
export const HEAD_BYTES = 16;

/**
 * @returns {"ok" | "mismatch" | "unchecked"} unchecked = no signature for this extension
 */
export function inspect(name, head) {
  const dot = name.lastIndexOf(".");
  const extension = dot === -1 ? "" : name.slice(dot).toLowerCase();
  const check = SIGNATURES[extension];
  if (!check) return "unchecked";
  return check(head) ? "ok" : "mismatch";
}
