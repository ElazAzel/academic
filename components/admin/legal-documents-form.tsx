"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Icon } from "@/components/ui/icon";

interface LegalDocumentState {
  content: string;
  version: string;
}

interface LegalDocumentsSettingsProps {
  initialDocs: {
    "privacy-policy": LegalDocumentState;
    "terms-of-use": LegalDocumentState;
    "cookie-notice": LegalDocumentState;
  };
  action: (formData: FormData) => Promise<void>;
}

const DOCUMENT_TITLES = {
  "privacy-policy": "Политика конфиденциальности",
  "terms-of-use": "Пользовательское соглашение",
  "cookie-notice": "Уведомление о cookie",
};

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

export function LegalDocumentsForm({ initialDocs, action }: LegalDocumentsSettingsProps) {
  const [docs, setDocs] = useState(initialDocs);
  const [activeSlug, setActiveSlug] = useState<keyof typeof DOCUMENT_TITLES>("privacy-policy");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [forceIncrement, setForceIncrement] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const activeDoc = docs[activeSlug];

  const handleContentChange = (val: string) => {
    setDocs((prev) => ({
      ...prev,
      [activeSlug]: {
        ...prev[activeSlug],
        content: val,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("slug", activeSlug);
      formData.append("content", activeDoc.content);
      formData.append("incrementVersion", forceIncrement ? "true" : "false");

      await action(formData);
      toast.success("Документ успешно сохранен");
      setForceIncrement(false);

      // We should ideally reload/re-fetch current settings. Since Server Actions reload layout cache,
      // let's update local version date state for UX to show it is updated (just to give clean visual feedback)
      if (forceIncrement) {
        const now = new Date();
        const timestamp = now.getTime();
        const nextVer = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${timestamp}`;
        setDocs((prev) => ({
          ...prev,
          [activeSlug]: {
            ...prev[activeSlug],
            version: nextVer,
          },
        }));
      }
    } catch (err) {
      toast.error("Не удалось сохранить документ");
    } finally {
      setIsSaving(false);
    }
  };

  const previewHtml = renderMarkdown(activeDoc.content);

  return (
    <Card className="rounded-lg border bg-m3-surface-container-lowest">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon name="description" className="text-m3-primary" size={20} />
          <CardTitle className="text-headline-sm">Пользовательские соглашения</CardTitle>
        </div>
        <CardDescription>
          Редактирование юридических документов, которые пользователи принимают при регистрации или первом входе.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Tabs Selector */}
        <div className="flex flex-wrap gap-2 border-b pb-4">
          {(Object.keys(DOCUMENT_TITLES) as Array<keyof typeof DOCUMENT_TITLES>).map((slug) => (
            <Button
              key={slug}
              variant={activeSlug === slug ? "primary" : "ghost"}
              size="sm"
              onClick={() => {
                setActiveSlug(slug);
                setMode("edit");
              }}
            >
              {DOCUMENT_TITLES[slug]}
            </Button>
          ))}
        </div>

        {/* Current Info Panel */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg bg-m3-surface-container-high px-4 py-3 border">
          <div>
            <p className="text-sm font-medium">Текущий документ: <span className="text-primary font-semibold">{DOCUMENT_TITLES[activeSlug]}</span></p>
            <p className="text-xs text-muted-foreground mt-0.5">Активная версия согласия: <strong className="font-semibold">{activeDoc.version}</strong></p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={mode === "edit" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setMode("edit")}
            >
              Редактор
            </Button>
            <Button
              variant={mode === "preview" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setMode("preview")}
            >
              Предпросмотр
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {mode === "edit" ? (
            <div className="space-y-2">
              <label htmlFor="content-editor" className="text-sm font-medium">Текст документа (формат Markdown)</label>
              <Textarea
                id="content-editor"
                value={activeDoc.content}
                onChange={(e) => handleContentChange(e.target.value)}
                className="min-h-[400px] font-mono text-sm leading-relaxed"
                placeholder="Введите текст документа в формате Markdown..."
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <span className="block text-sm font-medium">Предпросмотр форматирования</span>
              <div 
                className="min-h-[400px] max-h-[600px] overflow-y-auto rounded-md border p-6 bg-background prose prose-sm max-w-none [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:mt-8 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-5 [&_h3]:mb-2 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_ul]:my-3 [&_li]:text-sm [&_li]:leading-relaxed [&_strong]:font-semibold"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          )}

          {/* Version control toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4 bg-m3-surface-container-low">
            <div className="space-y-0.5">
              <span className="text-sm font-medium">
                Принудительно обновить версию для повторного согласия
              </span>
              <p className="text-xs text-muted-foreground mt-0.5">
                При включении все пользователи должны будут повторно принять этот документ при следующем действии.
              </p>
            </div>
            <Switch
              id="increment-version-toggle"
              checked={forceIncrement}
              onCheckedChange={setForceIncrement}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="submit"
              disabled={isSaving}
              className="min-w-[140px]"
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
