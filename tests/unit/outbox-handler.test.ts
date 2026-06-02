import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDequeuePendingEvents = vi.hoisted(() => vi.fn());
const mockMarkFailed = vi.hoisted(() => vi.fn());
const mockMarkSent = vi.hoisted(() => vi.fn());
const mockCreateNotificationInternal = vi.hoisted(() => vi.fn());

vi.mock("@/server/modules/outbox/service", () => ({
  dequeuePendingEvents: mockDequeuePendingEvents,
  markFailed: mockMarkFailed,
  markSent: mockMarkSent,
}));

vi.mock("@/server/modules/notifications/service", () => ({
  createNotificationInternal: mockCreateNotificationInternal,
}));

const { processNotificationEvents } = await import(
  "@/server/modules/notifications/outbox-handler"
);

describe("processNotificationEvents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  it("processes notification.send events and creates notifications", async () => {
    mockDequeuePendingEvents.mockResolvedValue([
      {
        id: "event-1",
        eventType: "notification.send",
        payload: {
          userId: "student-1",
          event: "access_granted",
          channel: "in_app",
          title: null,
          body: null,
          data: { courseId: "course-1" },
          refType: "enrollment",
          refId: "enrollment-1",
        },
      },
      {
        id: "event-2",
        eventType: "notification.send",
        payload: {
          userId: "student-2",
          event: "certificate_available",
          channel: "in_app",
          title: "Сертификат доступен",
          body: "Вы можете скачать сертификат",
          data: { certificateId: "cert-1" },
          refType: "certificate",
          refId: "cert-1",
        },
      },
    ]);
    mockCreateNotificationInternal.mockResolvedValue({ id: "notif-1" });

    const result = await processNotificationEvents(50);

    expect(result).toBe(2);
    expect(mockCreateNotificationInternal).toHaveBeenCalledTimes(2);
    expect(mockCreateNotificationInternal).toHaveBeenCalledWith({
      userId: "student-1",
      event: "access_granted",
      channel: "in_app",
      title: undefined,
      body: undefined,
      data: { courseId: "course-1" },
      refType: "enrollment",
      refId: "enrollment-1",
    });
    expect(mockCreateNotificationInternal).toHaveBeenCalledWith({
      userId: "student-2",
      event: "certificate_available",
      channel: "in_app",
      title: "Сертификат доступен",
      body: "Вы можете скачать сертификат",
      data: { certificateId: "cert-1" },
      refType: "certificate",
      refId: "cert-1",
    });
    expect(mockMarkSent).toHaveBeenCalledWith(["event-1", "event-2"]);
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it("skips non-notification events", async () => {
    mockDequeuePendingEvents.mockResolvedValue([
      {
        id: "event-1",
        eventType: "report.generate",
        payload: { reportType: "progress" },
      },
      {
        id: "event-2",
        eventType: "notification.send",
        payload: {
          userId: "student-1",
          event: "access_granted",
          data: {},
        },
      },
    ]);
    mockCreateNotificationInternal.mockResolvedValue({});

    const result = await processNotificationEvents(50);

    expect(result).toBe(1);
    expect(mockCreateNotificationInternal).toHaveBeenCalledTimes(1);
    expect(mockMarkSent).toHaveBeenCalledWith(["event-2"]);
  });

  it("marks event as failed when payload is invalid", async () => {
    mockDequeuePendingEvents.mockResolvedValue([
      {
        id: "event-1",
        eventType: "notification.send",
        payload: { userId: "", event: "" },
      },
    ]);

    const result = await processNotificationEvents(50);

    expect(result).toBe(1);
    expect(mockCreateNotificationInternal).not.toHaveBeenCalled();
    expect(mockMarkFailed).toHaveBeenCalledWith(
      "event-1",
      "Некорректный payload уведомления: отсутствует userId или event",
    );
    expect(mockMarkSent).not.toHaveBeenCalled();
  });

  it("marks event as failed when createNotificationInternal throws", async () => {
    mockDequeuePendingEvents.mockResolvedValue([
      {
        id: "event-1",
        eventType: "notification.send",
        payload: { userId: "student-1", event: "access_granted", data: {} },
      },
    ]);
    mockCreateNotificationInternal.mockRejectedValue(new Error("DB error"));

    const result = await processNotificationEvents(50);

    expect(result).toBe(1);
    expect(mockCreateNotificationInternal).toHaveBeenCalledTimes(1);
    expect(mockMarkFailed).toHaveBeenCalledWith("event-1", "Не удалось обработать уведомление");
  });

  it("returns 0 when there are no pending events", async () => {
    mockDequeuePendingEvents.mockResolvedValue([]);

    const result = await processNotificationEvents(50);

    expect(result).toBe(0);
    expect(mockCreateNotificationInternal).not.toHaveBeenCalled();
    expect(mockMarkSent).not.toHaveBeenCalled();
  });

  it("processes events with custom title and body overrides", async () => {
    mockDequeuePendingEvents.mockResolvedValue([
      {
        id: "event-1",
        eventType: "notification.send",
        payload: {
          userId: "curator-1",
          event: "new_message",
          channel: "in_app",
          title: "Новое сообщение от Ивана",
          body: "Привет! Как дела?",
          data: { link: "/curator/chat" },
          refType: "message",
          refId: "msg-1",
        },
      },
    ]);
    mockCreateNotificationInternal.mockResolvedValue({ id: "notif-1" });

    const result = await processNotificationEvents(50);

    expect(result).toBe(1);
    expect(mockCreateNotificationInternal).toHaveBeenCalledWith({
      userId: "curator-1",
      event: "new_message",
      channel: "in_app",
      title: "Новое сообщение от Ивана",
      body: "Привет! Как дела?",
      data: { link: "/curator/chat" },
      refType: "message",
      refId: "msg-1",
    });
    expect(mockMarkSent).toHaveBeenCalledWith(["event-1"]);
  });
});
