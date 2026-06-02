import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockCreateDiscussionPost = vi.hoisted(() => vi.fn());
const mockDeleteDiscussionPost = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/discussion/service", () => ({
  createDiscussionPost: mockCreateDiscussionPost,
  deleteDiscussionPost: mockDeleteDiscussionPost,
}));

const discussionPostsRoute = await import("@/app/api/v1/lessons/[lessonId]/discussion/posts/route");

function jsonRequest(method: "POST" | "DELETE", body: unknown) {
  return new Request("http://localhost/api/v1/lessons/lesson-1/discussion/posts", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function context(lessonId = "lesson-1") {
  return { params: Promise.resolve({ lessonId }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "student-1", roles: ["student"] });
  mockCreateDiscussionPost.mockResolvedValue({ id: "post-1", text: "Вопрос" });
  mockDeleteDiscussionPost.mockResolvedValue(undefined);
});

describe("lesson discussion posts API", () => {
  it("requires course read permission before deleting discussion posts", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("forbidden", "Недостаточно прав", 403));

    const response = await discussionPostsRoute.DELETE(
      jsonRequest("DELETE", { postId: "post-1" }),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockRequireUser).toHaveBeenCalledWith("courses:read");
    expect(mockDeleteDiscussionPost).not.toHaveBeenCalled();
  });

  it("validates delete payloads before calling the discussion service", async () => {
    const response = await discussionPostsRoute.DELETE(jsonRequest("DELETE", { postId: "" }), context());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockDeleteDiscussionPost).not.toHaveBeenCalled();
  });

  it("deletes a valid discussion post through the service", async () => {
    const response = await discussionPostsRoute.DELETE(
      jsonRequest("DELETE", { postId: "post-1" }),
      context("lesson-1"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(mockDeleteDiscussionPost).toHaveBeenCalledWith("student-1", "lesson-1", "post-1");
  });
});
