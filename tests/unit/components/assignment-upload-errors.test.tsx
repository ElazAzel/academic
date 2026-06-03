// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { StudentAssignmentDetail } from "@/types/domain";

const mockUploadMedia = vi.hoisted(() => vi.fn());
const mockRouterRefresh = vi.hoisted(() => vi.fn());
const mockToastError = vi.hoisted(() => vi.fn());
const mockToastSuccess = vi.hoisted(() => vi.fn());

vi.mock("@/lib/upload-with-compress", () => ({
  uploadMedia: mockUploadMedia,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRouterRefresh,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    error: mockToastError,
    success: mockToastSuccess,
  },
}));

const { AssignmentBlock } = await import("@/components/lms/assignment-block");
const { AssignmentView } = await import("@/app/student/assignments/[assignmentId]/assignment-view");

const assignment = {
  id: "assignment-1",
  title: "Домашнее задание",
  instructions: "Опишите решение",
  maxAttempts: 3,
  deadline: null,
  submission: null,
  courseId: "course-1",
  lessonId: "lesson-1",
} as unknown as StudentAssignmentDetail;

function getFileInput(container: HTMLElement) {
  const input = container.querySelector('input[type="file"]');
  expect(input).toBeInstanceOf(HTMLInputElement);
  return input as HTMLInputElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUploadMedia.mockResolvedValue({
    publicUrl: "/uploads/file.pdf",
    fileName: "file.pdf",
    compressed: false,
    originalSize: 10,
    finalSize: 10,
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("assignment upload errors", () => {
  it("does not expose raw assignment block upload exceptions in toast copy", async () => {
    mockUploadMedia.mockRejectedValue(new Error("postgres://secret-assignment-upload"));

    const { container } = render(<AssignmentBlock assignment={assignment} />);

    fireEvent.change(getFileInput(container), {
      target: { files: [new File(["body"], "answer.pdf", { type: "application/pdf" })] },
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Не удалось загрузить файл задания");
    });
    expect(mockToastError).not.toHaveBeenCalledWith(expect.stringContaining("secret-assignment-upload"));
  });

  it("preserves controlled assignment view upload errors", async () => {
    mockUploadMedia.mockRejectedValue(new Error("Недопустимый тип файла"));

    const { container } = render(<AssignmentView assignment={assignment} />);

    expect(screen.getByRole("button", { name: /Загрузить файл к заданию/i })).toBeInTheDocument();
    fireEvent.change(getFileInput(container), {
      target: { files: [new File(["body"], "answer.exe", { type: "application/octet-stream" })] },
    });

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith("Недопустимый тип файла");
    });
  });
});
