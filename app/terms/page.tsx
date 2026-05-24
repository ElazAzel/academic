import fs from "fs";
import path from "path";
import { SiteHeader } from "@/components/layout/site-header";

export const dynamic = "force-dynamic";

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      continue;
    } else if (line.startsWith("## ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h2 class="text-xl font-semibold mt-6 mb-3">${line.slice(3)}</h2>`);
    } else if (line.startsWith("### ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3 class="text-lg font-semibold mt-5 mb-2">${line.slice(4)}</h3>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) { html.push('<ul class="list-disc pl-6 space-y-1 my-3">'); inList = true; }
      const liContent = line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      html.push(`<li class="text-sm leading-relaxed">${liContent}</li>`);
    } else if (line.match(/^\d+\.\s/)) {
      if (inList) { html.push("</ul>"); inList = false; }
      const numContent = line.replace(/^\d+\.\s+/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      html.push(`<p class="text-sm leading-relaxed my-2">${line.match(/^\d+/)?.[0]}. ${numContent}</p>`);
    } else if (line.startsWith("|")) {
      if (inList) { html.push("</ul>"); inList = false; }
      continue;
    } else if (line.trim() === "") {
      if (inList) { html.push("</ul>"); inList = false; }
      continue;
    } else if (line.startsWith("---")) {
      if (inList) { html.push("</ul>"); inList = false; }
      continue;
    } else {
      if (inList) { html.push("</ul>"); inList = false; }
      const bold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
      html.push(`<p class="text-sm leading-relaxed my-2">${bold}</p>`);
    }
  }

  if (inList) html.push("</ul>");
  return html.join("\n");
}

export default function TermsPage() {
  const filePath = path.join(process.cwd(), "docs", "legal", "terms-of-use.md");
  const content = fs.readFileSync(filePath, "utf-8");
  const html = renderMarkdown(content);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold mb-8">Пользовательское соглашение</h1>
        <div
          className="prose prose-sm max-w-none [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ul]:my-3 [&_li]:text-sm [&_li]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </div>
  );
}
