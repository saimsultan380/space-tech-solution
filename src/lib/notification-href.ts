const HREF_MARKER = /\[\[href:(\/dashboard\/[^\]]+)\]\]/;

export function splitNotificationHref(body: string): { text: string; href?: string } {
  const match = body.match(HREF_MARKER);
  return {
    text: body.replace(HREF_MARKER, "").trim(),
    href: match?.[1],
  };
}
