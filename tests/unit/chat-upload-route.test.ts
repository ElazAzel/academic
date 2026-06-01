import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockBuildStorageKey = vi.hoisted(() => vi.fn());
const mockUploadFileToSupabase = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({
  requireUser: mockRequireUser,
}));

vi.mock("@/lib/storage", () => ({
  buildStorageKey: mockBuildStorageKey,
  uploadFileToSupabase: mockUploadFileToSupabase,
}));

const route = await import("@/app/api/v1/chat/upload/route");

function multipartRequest(file?: File) {
  const body = new FormData();
  if (file) {
    body.set("file", file);
  }
  return new Request("http://localhost/api/v1/chat/upload", {
    method: "POST",
    body,
  });
}

describe("chat upload route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireUser.mockResolvedValue({ id: "student-1", roles: ["student"] });
    mockBuildStorageKey.mockReturnValue("chat/student-1/file.txt");
    mockUploadFileToSupabase.mockResolvedValue(
      "https://storage.local/file.txt",
    );
  });

  it("preserves auth errors instead of masking them as upload failures", async () => {
    mockRequireUser.mockRejectedValue(
      new ApiError("unauthorized", "Требуется вход", 401),
    );

    const response = await route.POST(multipartRequest());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(mockUploadFileToSupabase).not.toHaveBeenCalled();
  });

  it("rejects unsupported attachment formats before storage upload", async () => {
    const response = await route.POST(
      multipartRequest(
        new File(["alert(1)"], "script.js", { type: "application/javascript" }),
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(415);
    expect(body.error.code).toBe("bad_request");
    expect(mockUploadFileToSupabase).not.toHaveBeenCalled();
  });

  it("uploads allowed attachments under the authenticated user's chat prefix", async () => {
    const response = await route.POST(
      multipartRequest(new File(["hello"], "note.txt", { type: "text/plain" })),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mockBuildStorageKey).toHaveBeenCalledWith(
      "chat/student-1",
      "note.txt",
    );
    expect(mockUploadFileToSupabase).toHaveBeenCalledWith(
      "chat/student-1/file.txt",
      expect.any(File),
    );
    expect(body).toEqual({
      publicUrl: "https://storage.local/file.txt",
      attachmentType: "text/plain",
    });
  });
});
