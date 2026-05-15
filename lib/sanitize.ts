import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p", "br", "strong", "b", "em", "i", "u", "s", "strike",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "ul", "ol", "li",
  "blockquote", "pre", "code",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
  "div", "span", "hr"
];

const ALLOWED_ATTR = [
  "href", "title", "target", "rel",
  "src", "alt", "width", "height",
];

export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") {
    // Server-side: return plain text or use a server-safe sanitizer
    // DOMPurify requires a DOM; on server we strip tags entirely as fallback
    return dirty.replace(/<[^>]*>?/gm, "");
  }
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
  });
}
