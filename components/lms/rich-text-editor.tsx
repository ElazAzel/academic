"use client";

import { useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import DOMPurify from "dompurify";
import { Bold, Italic, Heading2, List, ListOrdered, Link, Undo2, Redo2 } from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export function RichTextEditor({ value, onChange, minHeight = "120px" }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [3, 4] },
      }),
      LinkExtension.configure({ openOnClick: false }),
    ],
    content: value || "",
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const clean = DOMPurify.sanitize(html);
      onChange(clean);
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[80px] px-3 py-2 text-sm leading-relaxed",
      },
    },
  });

  const toggleLink = useCallback(() => {
    if (!editor) return;
    const previous = editor.getAttributes("link").href;
    const url = window.prompt("Ссылка", previous || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div
      className="rounded-xl border bg-background overflow-hidden"
      style={{ minHeight }}
    >
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b bg-muted/20 px-2 py-1.5">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Жирный">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Курсив">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Заголовок H3">
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Список">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Нумерованный список">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="mx-0.5 h-4 w-px bg-border" />
        <ToolbarButton onClick={toggleLink} active={editor.isActive("link")} title="Ссылка">
          <Link className="h-3.5 w-3.5" />
        </ToolbarButton>
        <span className="flex-1" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Отмена">
          <Undo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Повтор">
          <Redo2 className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="[&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror_p]:leading-relaxed" />
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-7 w-7 items-center justify-center rounded-md transition-colors ${
        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
