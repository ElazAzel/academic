
export const MESSAGE_PREVIEW_LENGTH = 160;

export function buildMessagePreview(text: string, hasAttachment: boolean) {
  const source = text.trim().replace(/\s+/g, " ") || (hasAttachment ? "Вложение" : "Сообщение");
  return source.length > MESSAGE_PREVIEW_LENGTH ? `${source.slice(0, MESSAGE_PREVIEW_LENGTH)}…` : source;
}
