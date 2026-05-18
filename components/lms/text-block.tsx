import { sanitizeHtml } from "@/lib/sanitize";

export function TextBlock({ html }: { html: string }) {
  const clean = sanitizeHtml(html);
  return (
    <div
      className="mx-auto max-w-[720px] text-body-md font-body-md leading-relaxed text-m3-on-surface-variant [&_h1]:text-headline-md [&_h1]:font-headline-md [&_h1]:text-m3-on-surface [&_h2]:text-title-lg [&_h2]:font-semibold [&_h2]:text-m3-on-surface [&_h3]:font-semibold [&_h3]:text-m3-on-surface [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-m3-outline-variant [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-m3-on-surface-variant/80"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
