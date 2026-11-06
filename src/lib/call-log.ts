export const CALL_LOG_BUCKET = "call-log-screenshots";
export const CALL_LOG_MAX_BYTES = 5 * 1024 * 1024;
export const CALL_LOG_ACCEPT = "image/png,image/jpeg,image/webp";

const EXTENSIONS = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
} as const;

export type CallLogImageExtension = keyof typeof EXTENSIONS;

function extensionFromMime(mime: string): CallLogImageExtension | null {
  if (mime === "image/png") return "png";
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  return null;
}

/** Normalize clipboard/drag files that may have no filename. */
export function normalizeCallLogImageFile(file: File): File {
  const checked = callLogImageFile(file);
  if ("error" in checked) return file;
  const hasExt = /\.(png|jpe?g|webp)$/i.test(file.name);
  if (hasExt && file.type === checked.contentType) return file;
  return new File([file], `screenshot.${checked.extension}`, {
    type: checked.contentType,
    lastModified: file.lastModified,
  });
}

export function callLogImageFile(file: File): { extension: CallLogImageExtension; contentType: string } | { error: string } {
  if (file.size <= 0) return { error: "Choose an image file." };
  if (file.size > CALL_LOG_MAX_BYTES) return { error: "Image must be 5 MB or smaller." };

  const nameExt = (file.name.toLowerCase().split(".").pop() ?? "") as string;
  let extension: CallLogImageExtension | null = null;
  if (nameExt === "png" || nameExt === "jpg" || nameExt === "jpeg" || nameExt === "webp") {
    extension = nameExt;
  } else {
    extension = extensionFromMime(file.type);
  }

  if (!extension) {
    return { error: "Upload a PNG, JPG, or WebP image." };
  }

  const contentType = EXTENSIONS[extension];
  if (file.type && file.type !== contentType) {
    return { error: "Upload a PNG, JPG, or WebP image." };
  }
  return { extension, contentType };
}

export function isCallLogScreenshotPath(path: string, agentId: string): boolean {
  const match = /^([0-9a-f-]{36})\/([0-9a-f-]{36})\.(png|jpg|jpeg|webp)$/i.exec(path);
  return Boolean(match && match[1] === agentId);
}

export function weekdayFromIsoDate(isoDate: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return "";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return "";
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date);
}

export function isIsoDate(value: string): boolean {
  return weekdayFromIsoDate(value) !== "";
}
