import { cn } from "@/lib/utils";
import Image from "next/image";

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
        "relative inline-flex h-9 w-9 overflow-hidden items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary",
        className,
      )}
      aria-label={name}
    >
      {image ? (
        <Image src={image} alt={name} fill sizes="120px" className="object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
