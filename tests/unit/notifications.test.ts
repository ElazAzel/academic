import { describe, expect, it } from "vitest";
import { renderNotificationTemplate } from "@/server/modules/notifications/service";

describe("notification templates", () => {
  it("renders Russian default copy", () => {
    const notification = renderNotificationTemplate("certificate_available");
    expect(notification.title).toBe("Сертификат доступен");
    expect(notification.body).toContain("Сертификат");
  });
});

