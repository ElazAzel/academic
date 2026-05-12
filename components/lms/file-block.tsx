import { Download, FileText } from "lucide-react";

export function FileBlock({ url, filename, fileType }: { url: string; filename?: string; fileType?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 rounded-xl border p-4 transition-all hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{filename ?? "Файл"}</p>
        {fileType && <p className="text-xs text-muted-foreground">{fileType}</p>}
      </div>
      <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
    </a>
  );
}
