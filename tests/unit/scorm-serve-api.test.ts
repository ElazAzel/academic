import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/http";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockAssertScormRuntimeAccess = vi.hoisted(() => vi.fn());
const mockGetScormPackageAccessContext = vi.hoisted(() => vi.fn());
const mockCreateScormLaunch = vi.hoisted(() => vi.fn());
const mockServeScormFile = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/scorm/service", () => ({
  assertScormRuntimeAccess: mockAssertScormRuntimeAccess,
  getScormPackageAccessContext: mockGetScormPackageAccessContext,
  createScormLaunch: mockCreateScormLaunch,
}));
vi.mock("@/server/modules/scorm/proxy", () => ({ serveScormFile: mockServeScormFile }));

const scormServeRoute = await import("@/app/api/v1/scorm/serve/[...path]/route");

function request() {
  return new Request("http://localhost/api/v1/scorm/serve/package-1/index.html");
}

function context(path = ["package-1", "index.html"]) {
  return { params: Promise.resolve({ path }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  mockRequireUser.mockResolvedValue({ id: "student-1", roles: ["student"] });
  mockAssertScormRuntimeAccess.mockResolvedValue(undefined);
  mockGetScormPackageAccessContext.mockResolvedValue({
    id: "package-1",
    lessonId: "lesson-1",
    courseId: "course-1",
  });
  mockCreateScormLaunch.mockResolvedValue({ id: "launch-1" });
  mockServeScormFile.mockResolvedValue({
    body: "<html></html>",
    contentType: "text/html; charset=utf-8",
  });
});

describe("SCORM file serving API", () => {
  it("requires authentication before resolving package files", async () => {
    mockRequireUser.mockRejectedValue(new ApiError("unauthorized", "Требуется вход", 401));

    const response = await scormServeRoute.GET(request(), context());
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.code).toBe("unauthorized");
    expect(mockGetScormPackageAccessContext).not.toHaveBeenCalled();
    expect(mockServeScormFile).not.toHaveBeenCalled();
  });

  it("rejects unsafe package paths before storage access", async () => {
    const response = await scormServeRoute.GET(request(), context(["package-1", "..", "secret.html"]));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
    expect(mockGetScormPackageAccessContext).not.toHaveBeenCalled();
    expect(mockServeScormFile).not.toHaveBeenCalled();
  });

  it("checks course scope before serving a SCORM file", async () => {
    mockAssertScormRuntimeAccess.mockRejectedValue(new ApiError("forbidden", "Нет доступа", 403));

    const response = await scormServeRoute.GET(request(), context());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe("forbidden");
    expect(mockAssertScormRuntimeAccess).toHaveBeenCalledWith(
      { id: "student-1", roles: ["student"] },
      { lessonId: "lesson-1", courseId: "course-1" },
    );
    expect(mockServeScormFile).not.toHaveBeenCalled();
  });

  it("creates a tracked launch before serving an entry point", async () => {
    const response = await scormServeRoute.GET(request(), context());
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toBe("<html></html>");
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mockCreateScormLaunch).toHaveBeenCalledWith("student-1", "lesson-1", "package-1");
    expect(mockServeScormFile).toHaveBeenCalledWith("package-1", "index.html", "launch-1");
  });

  it("serves subresources without creating an extra launch", async () => {
    mockServeScormFile.mockResolvedValue({
      body: "console.log('ok');",
      contentType: "application/javascript; charset=utf-8",
    });

    const response = await scormServeRoute.GET(request(), context(["package-1", "assets", "app.js"]));
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toBe("console.log('ok');");
    expect(response.headers.get("cache-control")).toBe("private, max-age=300");
    expect(mockCreateScormLaunch).not.toHaveBeenCalled();
    expect(mockServeScormFile).toHaveBeenCalledWith("package-1", "assets/app.js", undefined);
  });

  it("does not leak storage errors in the response", async () => {
    mockServeScormFile.mockRejectedValue(new Error("supabase://secret-storage-error"));

    const response = await scormServeRoute.GET(request(), context());
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.code).toBe("internal_error");
    expect(body.error.message).toBe("Не удалось загрузить SCORM-файл");
    expect(JSON.stringify(body)).not.toContain("secret-storage-error");
  });
});
