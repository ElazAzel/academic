import fs from "fs";
import path from "path";
import { notFound } from "next/navigation";
import { BRANDING } from "@/lib/branding";

export const metadata = {
  title: "Документация",
  description: `Документация платформы ${BRANDING.name}.`,
};


export const revalidate = 86400; // ISR: revalidate once per day
export const dynamicParams = true; // Allow generating new slugs on-demand

const ALLOWED_SLUGS = ["privacy-policy", "terms-of-use", "cookie-notice"];

export function generateStaticParams() {
  return ALLOWED_SLUGS.map((slug) => ({ slug }));
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h1 class="text-2xl font-semibold mt-8 mb-4">${line.slice(2)}</h1>`);
    } else if (line.startsWith("## ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h2 class="text-xl font-semibold mt-6 mb-3">${line.slice(3)}</h2>`);
    } else if (line.startsWith("### ")) {
      if (inList) { html.push("</ul>"); inList = false; }
      html.push(`<h3 class="text-lg font-semibold mt-5 mb-2">${line.slice(4)}</h3>`);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) { html.push('<ul class="list-disc pl-6 space-y-1 my-3">'); inList = true; }
      const bold = line.slice(2).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      html.push(`<li class="text-sm leading-relaxed">${bold}</li>`);
    } else if (line.match(/^\d+\.\s/)) {
      if (inList) { html.push("</ul>"); inList = false; }
      const bold = line.replace(/^\d+\.\s+/, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      html.push(`<p class="text-sm leading-relaxed my-2">${line.match(/^\d+/)?.[0]}. ${bold}</p>`);
    } else if (line.startsWith("|")) {
      if (inList) { html.push("</ul>"); inList = false; }
      continue;
    } else if (line.trim() === "") {
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

export default async function DocPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (!ALLOWED_SLUGS.includes(slug)) {
    notFound();
  }

  const dirsToCheck = [
    path.join(process.cwd(), "docs", "legal"),
    path.join(process.cwd(), "docs"),
  ];

  let filePath: string | null = null;
  for (const dir of dirsToCheck) {
    const candidate = path.join(dir, `${slug}.md`);
    if (fs.existsSync(candidate)) {
      filePath = candidate;
      break;
    }
  }

  if (!filePath) {
    notFound();
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const html = renderMarkdown(content);

  const titles: Record<string, string> = {
    "privacy-policy": "Политика конфиденциальности",
    "terms-of-use": "Пользовательское соглашение",
    "cookie-notice": "Уведомление об использовании cookie",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold mb-8">{titles[slug]}</h1>
        <div
          className="prose prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ul]:my-3 [&_li]:text-sm [&_li]:leading-relaxed [&_strong]:font-semibold"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  );
}
