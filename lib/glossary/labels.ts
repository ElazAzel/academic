const DIRECTION_LABELS: Record<string, string> = {
  general: "Общие",
  platform: "По функционалу платформы",
  learning_material: "По материалу обучения",
};

export function getDirectionLabel(direction: string): string {
  return DIRECTION_LABELS[direction] || direction;
}

export const DIRECTIONS = [
  { value: "general", label: "Общие" },
  { value: "platform", label: "По функционалу платформы" },
  { value: "learning_material", label: "По материалу обучения" },
];
