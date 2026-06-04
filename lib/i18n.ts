import ru from "@/locales/ru.json";
import { BRANDING } from "@/lib/branding";

type Dictionary = typeof ru;
type Key = keyof Dictionary;

export function t(key: Key) {
  if (key === "app.name") return BRANDING.name;
  return ru[key];
}
