/**
 * XP-утилиты: уровни, расчёт прогресса.
 * Без "use server" — чистые функции,可以使用 в серверных и клиентских компонентах.
 */

export const XP_LEVELS = [
  { level: 1, name: "Новичок", xpRequired: 0 },
  { level: 2, name: "Ученик", xpRequired: 200 },
  { level: 3, name: "Исследователь", xpRequired: 500 },
  { level: 4, name: "Эксперт", xpRequired: 1000 },
  { level: 5, name: "Магистр", xpRequired: 2000 },
  { level: 6, name: "Легенда", xpRequired: 5000 },
] as const;

export function getLevel(xp: number): { level: number; name: string; progress: number } {
  let currentIdx = 0;
  for (let i = 0; i < XP_LEVELS.length; i++) {
    if (xp >= XP_LEVELS[i].xpRequired) {
      currentIdx = i;
    }
  }

  const current = XP_LEVELS[currentIdx];
  const next = XP_LEVELS[Math.min(currentIdx + 1, XP_LEVELS.length - 1)];

  const range = next.xpRequired - current.xpRequired;
  const progress = range > 0 ? Math.min(100, ((xp - current.xpRequired) / range) * 100) : 100;

  return { level: current.level, name: current.name, progress: Math.round(progress) };
}
