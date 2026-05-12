import { Badge } from "@/components/ui/badge";

function normalizeVideoUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      const vid = u.searchParams.get("v") || u.pathname.slice(1);
      if (vid) return `https://www.youtube.com/embed/${vid}`;
    }
  } catch {}
  return url;
}

export function VideoBlock({ url, title, duration }: { url: string; title?: string; duration?: number }) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl">
        <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
          <iframe
            className="absolute inset-0 h-full w-full"
            src={normalizeVideoUrl(url)}
            title={title ?? "Видео"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
      {(title || duration) && (
        <div className="flex items-center gap-2">
          {title && <p className="text-sm font-medium">{title}</p>}
          {duration && <Badge className="border-primary/20 bg-primary/5 text-primary">{duration} мин.</Badge>}
        </div>
      )}
    </div>
  );
}
