const ALLOWED_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "p",
  "br",
  "div",
  "ul",
  "ol",
  "li",
  "span",
]);

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Keeps basic formatting only. Existing plain text stays readable. */
export function sanitizeRichText(input: string | null | undefined): string {
  const raw = input?.trim() ?? "";
  if (!raw) return "";

  if (!/<[a-z][\s\S]*>/i.test(raw)) {
    return escapeHtml(raw).replace(/\n/g, "<br>");
  }

  return raw
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s(on\w+|style|class|id)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/<\/?([a-z0-9]+)(\s[^>]*)?>/gi, (match, tag: string) => {
      const name = tag.toLowerCase();
      if (!ALLOWED_TAGS.has(name)) return "";
      if (match.startsWith("</")) return `</${name}>`;
      if (name === "br") return "<br>";
      return `<${name}>`;
    });
}
