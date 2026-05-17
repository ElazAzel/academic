/**
 * Download full NotoSans fonts with Cyrillic support from Google Fonts GitHub.
 * Run: node scripts/download-fonts.mjs
 */
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import https from "https";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(__dirname, "..", "public", "assets", "fonts");

const FONTS = [
  {
    name: "NotoSans-Regular.ttf",
    url: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
  },
  {
    name: "NotoSans-Bold.ttf",
    url: "https://cdn.jsdelivr.net/gh/googlefonts/noto-fonts@main/hinted/ttf/NotoSans/NotoSans-Bold.ttf",
  },
];

function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u) => {
      https.get(u, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return get(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url);
  });
}

mkdirSync(FONTS_DIR, { recursive: true });

for (const font of FONTS) {
  console.log(`Downloading ${font.name}...`);
  try {
    const buf = await download(font.url);
    const outPath = join(FONTS_DIR, font.name);
    writeFileSync(outPath, buf);
    console.log(`  ✓ ${font.name}: ${buf.length} bytes`);
  } catch (err) {
    console.error(`  ✗ ${font.name}: ${err.message}`);
  }
}

console.log("Done.");
