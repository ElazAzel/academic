/**
 * Проверяет наличие статических ассетов (шрифты, изображения сертификатов)
 * перед сборкой. Если ассеты не найдены — выводит предупреждение.
 *
 * Запускается через `postinstall` или вручную: `npx tsx scripts/check-assets.ts`
 */
import fs from "fs";
import path from "path";

const required = [
  "public/assets/fonts/NotoSans-Regular.ttf",
  "public/assets/fonts/NotoSans-Bold.ttf",
  "public/assets/fonts/NotoSans-Italic.ttf",
  "public/assets/certificates/border.png",
  "public/assets/certificates/seal.png",
  "public/assets/certificates/signature.png",
];

let allFound = true;
for (const rel of required) {
  const abs = path.join(process.cwd(), rel);
  if (!fs.existsSync(abs)) {
    console.warn(`⚠️  Missing asset: ${rel}`);
    allFound = false;
  }
}

if (allFound) {
  console.log("✅ All static assets found.");
} else {
  console.warn(
    "⚠️  Some assets are missing. Certificates PDF generation may fall back to " +
    "Helvetica font (no Cyrillic) or skip images."
  );
}
