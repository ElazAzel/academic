import { XMLParser } from "fast-xml-parser";

export interface ScormResource {
  identifier: string;
  href?: string;
  type: string;
  dependencies: string[];
}

export interface ScormOrganization {
  identifier: string;
  title: string;
}

export interface ParsedManifest {
  title: string;
  scormVersion: string;
  organizations: ScormOrganization[];
  resources: ScormResource[];
  entryPoint: string | null;
}

export function parseManifest(xmlContent: string): ParsedManifest {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const doc = parser.parse(xmlContent);
  const manifest = doc.manifest ?? doc.Manifest;
  if (!manifest) throw new Error("Invalid SCORM manifest: no <manifest> root");

  const meta = manifest.metadata ?? manifest.Metadata ?? {};
  const schemaver = meta.schemaversion ?? meta.SchemaVersion ?? meta.schemaversion ?? "";
  const versionStr = typeof schemaver === "string" ? schemaver : String(schemaver ?? "");
  const scormVersion = detectVersion(versionStr);

  const title =
    meta?.title ?? meta?.Title ?? "";

  const orgsRaw = manifest.organizations ?? manifest.Organizations ?? {};
  const orgList = orgsRaw.organization ?? orgsRaw.Organization ?? [];
  const orgsArr = Array.isArray(orgList) ? orgList : [orgList];
  const organizations: ScormOrganization[] = orgsArr.map((o: Record<string, unknown>) => ({
    identifier: String(o["@_identifier"] ?? o["@_id"] ?? ""),
    title: String(o["@_title"] ?? o["title"] ?? ""),
  }));
  const resolvedTitle = title || organizations[0]?.title || "SCORM Package";

  const resRaw = manifest.resources ?? manifest.Resources ?? {};
  const resList = resRaw.resource ?? resRaw.Resource ?? [];
  const resArr = Array.isArray(resList) ? resList : [resList];
  const resources: ScormResource[] = resArr.map((r: Record<string, unknown>) => {
    const deps = r.dependency ?? r.Dependency ?? [];
    const depsArr = Array.isArray(deps) ? deps : [deps];
    return {
      identifier: String(r["@_identifier"] ?? r["@_id"] ?? ""),
      href: String(r["@_href"] ?? r["@_url"] ?? ""),
      type: String(r["@_type"] ?? r["@_adlcp:scormtype"] ?? ""),
      dependencies: depsArr.map((d: Record<string, unknown>) => String(d["@_identifierref"] ?? "")).filter(Boolean),
    };
  });

  const orgItem = orgsArr[0]?.item ?? orgsArr[0]?.Item ?? orgsArr[0]?.items ?? [];
  const firstItem = Array.isArray(orgItem) ? orgItem[0] : orgItem;
  const resourceRef = firstItem?.["@_identifierref"] ?? "";
  const entryResource = resources.find((r) => r.identifier === resourceRef);
  let entryPoint = entryResource?.href ?? resources[0]?.href ?? null;

  if (entryPoint) entryPoint = entryPoint.replace(/^\//, "");

  return { title: resolvedTitle, scormVersion, organizations, resources, entryPoint };
}

function detectVersion(versionStr: string): string {
  const v = versionStr.trim().toLowerCase();
  if (v.includes("2004") || v.includes("cam") || v.includes("1.3")) return "2004";
  if (v.includes("1.2")) return "1.2";
  return v || "1.2";
}
