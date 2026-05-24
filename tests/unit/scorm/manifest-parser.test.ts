import { describe, it, expect } from "vitest";
import { parseManifest } from "@/server/modules/scorm/manifest-parser";

const SCORM_12_MANIFEST = `<?xml version="1.0"?>
<manifest identifier="test" version="1">
  <metadata>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org1">
    <organization identifier="org1" title="Test Course">
      <item identifier="item1" identifierref="res1">
        <title>Lesson 1</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="res1" href="index.html" type="webcontent" adlcp:scormtype="sco"/>
  </resources>
</manifest>`;

describe("parseManifest", () => {
  it("parses SCORM 1.2 manifest", () => {
    const result = parseManifest(SCORM_12_MANIFEST);
    expect(result.title).toBe("Test Course");
    expect(result.scormVersion).toBe("1.2");
    expect(result.organizations).toHaveLength(1);
    expect(result.organizations[0].title).toBe("Test Course");
    expect(result.resources).toHaveLength(1);
    expect(result.resources[0].href).toBe("index.html");
    expect(result.entryPoint).toBe("index.html");
  });

  it("throws on missing manifest root", () => {
    expect(() => parseManifest("<root/>")).toThrow("Invalid SCORM manifest");
  });
});
