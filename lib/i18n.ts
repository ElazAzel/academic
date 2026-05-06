import ru from "@/locales/ru.json";

type Dictionary = typeof ru;
type Key = keyof Dictionary;

export function t(key: Key) {
  return ru[key];
}

