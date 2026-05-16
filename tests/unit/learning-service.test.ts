import { describe, expect, it } from "vitest";
import { parseContentBlocks } from "@/server/modules/learning/service";

describe("parseContentBlocks", () => {
  it("parses blocks array from content", () => {
    const content = {
      blocks: [
        { id: "b1", type: "text", data: { html: "<p>Hello</p>" } },
        { id: "b2", type: "video", data: { videoUrl: "https://example.com/video.mp4", title: "Intro" } },
      ],
    };
    const blocks = parseContentBlocks(content);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].type).toBe("text");
    if (blocks[0].type === "text") {
      expect(blocks[0].data.html).toBe("<p>Hello</p>");
    }
    expect(blocks[1].type).toBe("video");
    if (blocks[1].type === "video") {
      expect(blocks[1].data.videoUrl).toBe("https://example.com/video.mp4");
    }
  });

  it("parses legacy text format", () => {
    const content = { text: "Legacy lesson content" };
    const blocks = parseContentBlocks(content);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("text");
    if (blocks[0].type === "text") {
      expect(blocks[0].data.html).toBe("Legacy lesson content");
    }
  });

  it("returns empty array for empty content", () => {
    const blocks = parseContentBlocks({});
    expect(blocks).toHaveLength(0);
  });

  it("returns empty array for null content", () => {
    const blocks = parseContentBlocks({} as Record<string, unknown>);
    expect(blocks).toHaveLength(0);
  });
});
