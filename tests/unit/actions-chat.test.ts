import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockCreateNotification = vi.hoisted(() => vi.fn());
const mockBuildStorageKey = vi.hoisted(() => vi.fn());
const mockCreatePresignedUploadUrl = vi.hoisted(() => vi.fn());

const mockMessageFindMany = vi.hoisted(() => vi.fn());
const mockMessageCreate = vi.hoisted(() => vi.fn());
const mockMessageUpdateMany = vi.hoisted(() => vi.fn());
const mockCuratorAssignmentFindFirst = vi.hoisted(() => vi.fn());
const mockUserFindUnique = vi.hoisted(() => vi.fn());
const mockLessonFindFirst = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({ requireRole: mockRequireRole }));
vi.mock("next/cache", () => ({ revalidatePath: mockRevalidatePath }));
vi.mock("@/server/modules/notifications/service", () => ({ createNotification: mockCreateNotification }));
vi.mock("@/lib/storage", () => ({
  buildStorageKey: mockBuildStorageKey,
  createPresignedUploadUrl: mockCreatePresignedUploadUrl,
}));
vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    message: {
      findMany: mockMessageFindMany,
      create: mockMessageCreate,
      updateMany: mockMessageUpdateMany,
    },
    curatorAssignment: { findFirst: mockCuratorAssignmentFindFirst },
    user: { findUnique: mockUserFindUnique },
    lesson: { findFirst: mockLessonFindFirst },
  }),
}));

const {
  getConversation,
  getMyConversations,
  sendMessageAction,
  getUploadUrlForFile,
  markAsRead,
} = await import("@/server/actions/chat");

const curatorUser = { id: "cur1", email: "curator@test.com", name: "Мадина", roles: ["curator"] };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue(curatorUser);
  mockCuratorAssignmentFindFirst.mockResolvedValue({ id: "assignment1" });
  mockMessageFindMany.mockResolvedValue([]);
  mockMessageCreate.mockResolvedValue({ id: "message1" });
  mockMessageUpdateMany.mockResolvedValue({ count: 1 });
  mockUserFindUnique.mockResolvedValue({
    id: "student1",
    name: "Слушатель1",
    roles: [{ role: { key: "student" } }],
  });
  mockLessonFindFirst.mockResolvedValue({
    id: "lesson1",
    title: "Prompt engineering",
    module: {
      id: "module1",
      title: "AI Governance",
      courseId: "course1",
      course: { title: "AI Strategy" },
    },
  });
  mockCreateNotification.mockResolvedValue({ id: "notification1" });
  mockBuildStorageKey.mockReturnValue("chat/cur1/file.pdf");
  mockCreatePresignedUploadUrl.mockResolvedValue({
    url: "https://storage.example/upload",
    publicUrl: "https://storage.example/file.pdf",
  });
});

describe("chat actions", () => {
  it("blocks a curator from reading an unassigned student chat", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockCuratorAssignmentFindFirst.mockResolvedValue(null);

    await expect(getConversation("student1")).rejects.toMatchObject({ code: "forbidden", status: 403 });
    expect(mockMessageFindMany).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("wraps unexpected conversation read errors without leaking details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockMessageFindMany.mockRejectedValue(new Error("postgres://secret-chat-read"));

    let caught: unknown;
    try {
      await getConversation("student1");
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      code: "internal_error",
      status: 500,
      message: "Внутренняя ошибка сервера",
    } satisfies Partial<ApiError>);
    expect((caught as Error).message).not.toContain("secret-chat-read");
    expect(consoleSpy).toHaveBeenCalledWith("[getConversation]", expect.any(Error));
    consoleSpy.mockRestore();
  });

  it("returns lesson context for conversation messages", async () => {
    mockMessageFindMany.mockResolvedValue([
      {
        id: "m1",
        text: "Question from lesson",
        attachmentUrl: null,
        attachmentType: null,
        lessonId: "lesson1",
        lesson: { id: "lesson1", title: "Prompt engineering" },
        senderId: "student1",
        sender: {
          id: "student1",
          name: "Слушатель1",
          roles: [{ role: { key: "student" } }],
        },
        createdAt: new Date("2026-05-16T08:00:00.000Z"),
        readAt: null,
      },
    ]);

    await expect(getConversation("student1")).resolves.toEqual([
      expect.objectContaining({
        id: "m1",
        lessonId: "lesson1",
        lessonTitle: "Prompt engineering",
        senderName: "Слушатель #DENT1",
      }),
    ]);
  });

  it("shows curator name with role prefix to a student", async () => {
    mockRequireRole.mockResolvedValue({
      id: "student1",
      email: "student@test.com",
      name: "Слушатель1",
      roles: ["student"],
    });
    mockMessageFindMany.mockResolvedValue([
      {
        id: "m1",
        text: "Ответ по уроку",
        attachmentUrl: null,
        attachmentType: null,
        lessonId: null,
        lesson: null,
        senderId: "cur1",
        sender: {
          id: "cur1",
          name: "Мадина",
          roles: [{ role: { key: "curator" } }],
        },
        createdAt: new Date("2026-05-16T08:00:00.000Z"),
        readAt: null,
      },
    ]);

    await expect(getConversation("student1")).resolves.toEqual([
      expect.objectContaining({ senderName: "Куратор Мадина" }),
    ]);
  });

  it("uses the issued student name in the curator conversation list", async () => {
    mockMessageFindMany.mockResolvedValue([
      {
        id: "m1",
        text: "Вопрос по уроку",
        senderId: "student1",
        receiverId: "cur1",
        readAt: null,
        createdAt: new Date("2026-05-16T08:00:00.000Z"),
        lessonId: null,
        lesson: null,
        sender: {
          id: "student1",
          name: "Слушатель1",
          roles: [{ role: { key: "student" } }],
        },
        receiver: {
          id: "cur1",
          name: "Мадина",
          roles: [{ role: { key: "curator" } }],
        },
      },
    ]);

    await expect(getMyConversations()).resolves.toEqual([
      expect.objectContaining({
        partnerId: "student1",
        partnerName: "Слушатель #DENT1",
        responseStatus: "awaiting_reply",
        responseLabel: "Ожидает ответа",
      }),
    ]);
  });

  it("marks a conversation as answered when the latest message is mine", async () => {
    mockMessageFindMany.mockResolvedValue([
      {
        id: "m2",
        text: "Ответил",
        senderId: "cur1",
        receiverId: "student1",
        readAt: null,
        createdAt: new Date("2026-05-16T09:00:00.000Z"),
        lessonId: "lesson1",
        lesson: { id: "lesson1", title: "Prompt engineering" },
        sender: {
          id: "cur1",
          name: "Мадина",
          roles: [{ role: { key: "curator" } }],
        },
        receiver: {
          id: "student1",
          name: "Слушатель1",
          roles: [{ role: { key: "student" } }],
        },
      },
      {
        id: "m1",
        text: "Вопрос по уроку",
        senderId: "student1",
        receiverId: "cur1",
        readAt: new Date("2026-05-16T08:30:00.000Z"),
        createdAt: new Date("2026-05-16T08:00:00.000Z"),
        lessonId: "lesson1",
        lesson: { id: "lesson1", title: "Prompt engineering" },
        sender: {
          id: "student1",
          name: "Слушатель1",
          roles: [{ role: { key: "student" } }],
        },
        receiver: {
          id: "cur1",
          name: "Мадина",
          roles: [{ role: { key: "curator" } }],
        },
      },
    ]);

    await expect(getMyConversations()).resolves.toEqual([
      expect.objectContaining({
        partnerId: "student1",
        responseStatus: "answered",
        responseLabel: "Отвечено",
        lessonTitle: "Prompt engineering",
      }),
    ]);
  });

  it("allows a curator to send a message only to an assigned student", async () => {
    const formData = new FormData();
    formData.set("receiverId", "student1");
    formData.set("lessonId", "lesson1");
    formData.set("text", "Проверьте комментарий");

    await expect(sendMessageAction(formData)).resolves.toEqual({ success: true });
    expect(mockCuratorAssignmentFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { studentId: "student1", curatorId: "cur1", active: true } }),
    );
    expect(mockMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderId: "cur1",
          receiverId: "student1",
          lessonId: "lesson1",
        }),
      }),
    );
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Новое сообщение от Куратор Мадина",
        body: "Prompt engineering: Проверьте комментарий",
        userId: "student1",
        refType: "message",
        refId: "message1",
        data: expect.objectContaining({
          link: "/student/lessons/lesson1",
          url: "/student/lessons/lesson1",
          messageId: "message1",
          lessonId: "lesson1",
          lessonTitle: "Prompt engineering",
          conversationStudentId: "student1",
        }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/curator/chat");
  });

  it("routes a student message to the assigned curator with lesson origin", async () => {
    mockRequireRole.mockResolvedValue({
      id: "student1",
      email: "student@test.com",
      name: "Слушатель1",
      roles: ["student"],
    });
    mockCuratorAssignmentFindFirst.mockResolvedValue({ curatorId: "cur1" });
    mockUserFindUnique.mockResolvedValue({
      id: "cur1",
      name: "Мадина",
      roles: [{ role: { key: "curator" } }],
    });

    const formData = new FormData();
    formData.set("lessonId", "lesson1");
    formData.set("text", "Нужна помощь по кейсу");

    await expect(sendMessageAction(formData)).resolves.toEqual({ success: true });

    expect(mockLessonFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "lesson1" }),
      }),
    );
    expect(mockMessageCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderId: "student1",
          receiverId: "cur1",
          lessonId: "lesson1",
        }),
      }),
    );
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "cur1",
        title: "Новое сообщение от Слушатель #DENT1",
        body: "Prompt engineering: Нужна помощь по кейсу",
        data: expect.objectContaining({
          link: "/curator/chat",
          url: "/curator/chat",
          conversationStudentId: "student1",
          lessonTitle: "Prompt engineering",
        }),
      }),
    );
  });

  it("rejects oversized text messages before creating a message", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const formData = new FormData();
    formData.set("receiverId", "student1");
    formData.set("text", "x".repeat(10_001));

    await expect(sendMessageAction(formData)).rejects.toMatchObject({ code: "bad_request", status: 400 });
    expect(mockMessageCreate).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("marks only messages received by the current user as read", async () => {
    await markAsRead(["m1", "m2", "m1", ""]);

    expect(mockMessageUpdateMany).toHaveBeenCalledWith({
      where: { id: { in: ["m1", "m2"] }, receiverId: "cur1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it("presigns uploads with the real filename and content type", async () => {
    await expect(getUploadUrlForFile("brief.pdf", "application/pdf")).resolves.toEqual({
      url: "https://storage.example/upload",
      publicUrl: "https://storage.example/file.pdf",
    });

    expect(mockBuildStorageKey).toHaveBeenCalledWith("chat/cur1", "brief.pdf");
    expect(mockCreatePresignedUploadUrl).toHaveBeenCalledWith("chat/cur1/file.pdf", "application/pdf");
  });

  it("rejects unsupported upload content types", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(getUploadUrlForFile("script.js", "application/javascript")).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
    });
    expect(mockCreatePresignedUploadUrl).not.toHaveBeenCalled();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
