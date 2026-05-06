import { cn } from "@/lib/utils";

export function Avatar({ name, image, className }: { name: string; image?: string | null; className?: string }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary",
        className,
      )}
      aria-label={name}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={name} className="h-full w-full rounded-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
