import path from "path";
import { dataDir } from "./store";

export function uploadsDir() {
  return process.env.UPLOADS_DIR?.trim() || path.join(dataDir(), "uploads");
}

// invariant: matches only names the upload route generates, so no request can
// reach a path outside UPLOADS_DIR or a file type the route never wrote.
export const UPLOAD_NAME = /^[0-9]+-[0-9a-f]{8}\.(jpg|png|webp|gif)$/;

export const UPLOAD_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

export function extensionForMime(mime: string) {
  return Object.keys(UPLOAD_TYPES).find((ext) => UPLOAD_TYPES[ext] === mime) ?? null;
}
