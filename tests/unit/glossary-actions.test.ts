import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireRole = vi.hoisted(() => vi.fn());
const mockRevalidatePath = vi.hoisted(() => vi.fn());
const mockLogAudit = vi.hoisted(() => vi.fn());
const mockGlossaryEntryFindMany = vi.hoisted(() => vi.fn());
const mockGlossaryEntryCreate = vi.hoisted(() => vi.fn());
const mockGlossaryEntryUpdate = vi.hoisted(() => vi.fn());
const mockGlossaryEntryDelete = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/page-guards", () => ({
  requireRole: mockRequireRole,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/server/modules/audit/service", () => ({
  logAudit: mockLogAudit,
}));

vi.mock("@/lib/prisma", () => ({
  getPrisma: () => ({
    glossaryEntry: {
      findMany: mockGlossaryEntryFindMany,
      create: mockGlossaryEntryCreate,
      update: mockGlossaryEntryUpdate,
      delete: mockGlossaryEntryDelete,
    },
  }),
}));

const {
  createGlossaryEntryAction,
  deleteGlossaryEntryAction,
  getGlossaryCategories,
  getGlossaryEntries,
  updateGlossaryEntryAction,
} = await import("@/server/actions/glossary");

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireRole.mockResolvedValue({ id: "admin-1", roles: ["admin"] });
  mockRevalidatePath.mockReturnValue(undefined);
  mockLogAudit.mockResolvedValue(undefined);
  mockGlossaryEntryFindMany.mockResolvedValue([]);
  mockGlossaryEntryCreate.mockResolvedValue({ id: "entry-1" });
  mockGlossaryEntryUpdate.mockResolvedValue({ id: "entry-1" });
  mockGlossaryEntryDelete.mockResolvedValue({ id: "entry-1" });
});

function glossaryForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("id", overrides.id ?? "entry-1");
  formData.set("question", overrides.question ?? "Что такое дедлайн?");
  formData.set("answer", overrides.answer ?? "Срок сдачи задания.");
  formData.set("category", overrides.category ?? "Общее");
  formData.set("direction", overrides.direction ?? "general");
  return formData;
}

describe("glossary actions safe error handling", () => {
  it("does not log controlled glossary validation errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await expect(getGlossaryEntries(123 as never)).rejects.toMatchObject({
        code: "validation_error",
        status: 422,
      } satisfies Partial<ApiError>);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockRequireRole).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("wraps glossary entries failures without exposing raw details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGlossaryEntryFindMany.mockRejectedValueOnce(new Error("postgres://secret-glossary-entries"));

    try {
      await expect(getGlossaryEntries()).rejects.toMatchObject({
        code: "internal_error",
        status: 500,
        message: "Не удалось загрузить глоссарий",
      } satisfies Partial<ApiError>);
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-glossary-entries");
      expect(consoleSpy).toHaveBeenCalledWith("[getGlossaryEntries]", expect.objectContaining({ errorType: "Error" }));
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("wraps category failures without exposing raw details", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGlossaryEntryFindMany.mockRejectedValueOnce(new Error("postgres://secret-glossary-categories"));

    try {
      await expect(getGlossaryCategories()).rejects.toMatchObject({
        code: "internal_error",
        status: 500,
        message: "Не удалось загрузить категории глоссария",
      } satisfies Partial<ApiError>);
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-glossary-categories");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[getGlossaryCategories]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not log controlled create validation errors", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      await expect(createGlossaryEntryAction(glossaryForm({ question: "" }))).rejects.toMatchObject({
        code: "bad_request",
        status: 400,
        message: "Вопрос и ответ обязательны",
      } satisfies Partial<ApiError>);
      expect(consoleSpy).not.toHaveBeenCalled();
      expect(mockGlossaryEntryCreate).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not leak raw create failures", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGlossaryEntryCreate.mockRejectedValueOnce(new Error("postgres://secret-glossary-create"));

    try {
      const result = await createGlossaryEntryAction(glossaryForm());

      expect(result).toEqual({ success: false, error: "Произошла ошибка при создании записи" });
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-glossary-create");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[createGlossaryEntryAction]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not leak raw update failures", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGlossaryEntryUpdate.mockRejectedValueOnce(new Error("postgres://secret-glossary-update"));

    try {
      const result = await updateGlossaryEntryAction(glossaryForm());

      expect(result).toEqual({ success: false, error: "Произошла ошибка при обновлении записи" });
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-glossary-update");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[updateGlossaryEntryAction]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("does not leak raw delete failures", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockGlossaryEntryDelete.mockRejectedValueOnce(new Error("postgres://secret-glossary-delete-action"));

    try {
      const result = await deleteGlossaryEntryAction("entry-1");

      expect(result).toEqual({ success: false, error: "Произошла ошибка при удалении записи" });
      expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("secret-glossary-delete-action");
      expect(consoleSpy).toHaveBeenCalledWith(
        "[deleteGlossaryEntryAction]",
        expect.objectContaining({ errorType: "Error" }),
      );
    } finally {
      consoleSpy.mockRestore();
    }
  });
});
