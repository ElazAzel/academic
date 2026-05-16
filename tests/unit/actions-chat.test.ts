import { beforeEach, describe, expect, it, vi } from "vitest";

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
    roles: [{ role: { key: "student" } }],
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
    mockCuratorAssignmentFindFirst.mockResolvedValue(null);

    await expect(getConversation("student1")).rejects.toMatchObject({ code: "forbidden", status: 403 });
    expect(mockMessageFindMany).not.toHaveBeenCalled();
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
        senderName: "Слушатель1",
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
        partnerName: "Слушатель1",
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
        userId: "student1",
        data: expect.objectContaining({ link: "/student/lessons/lesson1" }),
      }),
    );
    expect(mockRevalidatePath).toHaveBeenCalledWith("/curator/chat");
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
    await expect(getUploadUrlForFile("script.js", "application/javascript")).rejects.toMatchObject({
      code: "bad_request",
      status: 400,
    });
    expect(mockCreatePresignedUploadUrl).not.toHaveBeenCalled();
  });
});
