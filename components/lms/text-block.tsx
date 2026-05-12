import { sanitizeHtml } from "@/lib/sanitize";

export function TextBlock({ html }: { html: string }) {
  const clean = sanitizeHtml(html);
  return (
    <div
      className="mx-auto max-w-[720px] text-sm leading-relaxed text-muted-foreground [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground [&_h3]:font-semibold [&_h3]:text-foreground [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-1 [&_blockquote]:border-l-4 [&_blockquote]:border-primary/20 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground/80"
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
