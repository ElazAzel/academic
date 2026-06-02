import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRequireUser = vi.hoisted(() => vi.fn());
const mockUpdateScormLaunch = vi.hoisted(() => vi.fn());
const mockGetCmiValue = vi.hoisted(() => vi.fn());
const mockSetCmiValues = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth/session", () => ({ requireUser: mockRequireUser }));
vi.mock("@/server/modules/scorm/service", () => ({ updateScormLaunch: mockUpdateScormLaunch }));
vi.mock("@/server/modules/scorm/cmi-service", () => ({
  getCmiValue: mockGetCmiValue,
  setCmiValues: mockSetCmiValues,
}));

const launchRoute = await import("@/app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/route");
const cmiRoute = await import("@/app/api/v1/lessons/[lessonId]/scorm/launch/[launchId]/cmi/route");

function jsonRequest(method: "PATCH" | "POST", body: unknown) {
  return new Request("http://localhost/api/v1/lessons/lesson-1/scorm/launch/launch-1", {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function cmiRequest(url = "http://localhost/api/v1/lessons/lesson-1/scorm/launch/launch-1/cmi") {
  return new Request(url);
}

function context() {
  return { params: Promise.resolve({ lessonId: "lesson-1", launchId: "launch-1" }) };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireUser.mockResolvedValue({ id: "student-1", roles: ["student"] });
  mockUpdateScormLaunch.mockResolvedValue({ id: "launch-1" });
  mockGetCmiValue.mockResolvedValue("completed");
  mockSetCmiValues.mockResolvedValue(undefined);
});

describe("SCORM launch API", () => {
  it("validates launch update payloads before updating the launch", async () => {
    const response = await launchRoute.PATCH(jsonRequest("PATCH", { status: "INVALID" }), context());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockUpdateScormLaunch).not.toHaveBeenCalled();
  });

  it("updates a launch with normalized numeric fields", async () => {
    const response = await launchRoute.PATCH(
      jsonRequest("PATCH", { status: "COMPLETED", score: "95", maxScore: 100 }),
      context(),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ id: "launch-1" });
    expect(mockUpdateScormLaunch).toHaveBeenCalledWith("launch-1", "student-1", {
      status: "COMPLETED",
      score: 95,
      maxScore: 100,
    });
  });

  it("requires a CMI name query parameter before reading values", async () => {
    const response = await cmiRoute.GET(cmiRequest(), context());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("bad_request");
    expect(mockGetCmiValue).not.toHaveBeenCalled();
  });

  it("validates CMI set payloads before committing values", async () => {
    const response = await cmiRoute.POST(jsonRequest("POST", { values: { "cmi.score.raw": 95 } }), context());
    const body = await response.json();

    expect(response.status).toBe(422);
    expect(body.error.code).toBe("validation_error");
    expect(mockSetCmiValues).not.toHaveBeenCalled();
  });

  it("commits valid CMI string values for the current launch", async () => {
    const values = { "cmi.score.raw": "95", "cmi.completion_status": "completed" };

    const response = await cmiRoute.POST(jsonRequest("POST", { values }), context());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({ success: true });
    expect(mockSetCmiValues).toHaveBeenCalledWith("launch-1", "student-1", values);
  });
});
