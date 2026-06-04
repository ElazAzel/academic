import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import type { BrandingConfig } from "@/lib/branding";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "h-8 w-8 rounded-xl",
  md: "h-10 w-10 rounded-xl",
  lg: "h-14 w-14 rounded-2xl",
} as const;

const ICON_SIZES = {
  sm: 20,
  md: 24,
  lg: 28,
} as const;

export function BrandMark({
  branding,
  size = "md",
  className,
}: {
  branding: BrandingConfig;
  size?: keyof typeof SIZE_CLASSES;
  className?: string;
}) {
  const logoUrl = branding.logoUrl.trim();

  return (
    <span className={cn("academy-brand-mark flex shrink-0 items-center justify-center overflow-hidden text-white", SIZE_CLASSES[size], className)}>
      {logoUrl ? (
        <Image
          src={logoUrl}
          alt=""
          width={64}
          height={64}
          className="h-full w-full rounded-[inherit] object-contain p-1"
          aria-hidden="true"
        />
      ) : (
        <Icon name={branding.logoIcon} size={ICON_SIZES[size]} fill aria-hidden="true" />
      )}
    </span>
  );
}
