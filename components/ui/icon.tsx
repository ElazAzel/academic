import { cn } from "@/lib/utils";

/**
 * Обёртка для Material Symbols (Google Fonts icon font).
 *
 * Использование:
 * ```tsx
 * <Icon name="home" />
 * <Icon name="arrow_back" className="text-m3-primary" size={20} />
 * ```
 *
 * Доступные стили: `rounded` (по умолчанию), `outlined`, `sharp`, `two-tone`.
 * Полный список иконок: https://fonts.google.com/icons
 */
export function Icon({
  name,
  size = 24,
  weight = 400,
  grade = 0,
  fill = false,
  opticalSize = 24,
  className,
  style,
  ...props
}: {
  name: string;
  size?: number;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  grade?: -25 | 0 | 200;
  fill?: boolean;
  opticalSize?: number;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "children">) {
  return (
    <span
      className={cn("material-symbols-rounded select-none", className)}
      style={{
        fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}, 'GRAD' ${grade}, 'opsz' ${opticalSize}`,
        fontSize: size,
        lineHeight: 1,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      {name}
    </span>
  );
}
