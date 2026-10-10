import { accessSync, constants } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const execFileAsync = promisify(execFile);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CARRIER = resolve(ROOT, "build", "rename-noreplace");

export class NoReplacePublicationError extends Error {
  constructor(message, code, cause) {
    super(message, { cause });
    this.name = "NoReplacePublicationError";
    this.code = code;
  }
}

export async function renameNoReplace(source, target, { carrier = DEFAULT_CARRIER, timeoutMs = 120000 } = {}) {
  accessSync(carrier, constants.X_OK);
  try {
    await execFileAsync(carrier, [source, target], { timeout: timeoutMs, windowsHide: true, maxBuffer: 4096 });
  } catch (error) {
    if (error?.code === 17) throw new NoReplacePublicationError("target already exists", "EEXIST", error);
    if (error?.code === 18) throw new NoReplacePublicationError("stage and target are on different filesystems", "EXDEV", error);
    throw new NoReplacePublicationError("renameat2 no-replace publication failed", "ERENAME_NOREPLACE", error);
  }
}

export const RENAME_NOREPLACE_CARRIER = DEFAULT_CARRIER;
