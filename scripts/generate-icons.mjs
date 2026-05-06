import path from "node:path";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const rootDir = process.cwd();
const sourcePath = path.join(rootDir, "assets", "logo-source.png");
const outputDir = path.join(rootDir, "assets", "icons");

const sizes = [16, 24, 32, 48, 64, 128, 256, 512];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

for (const size of sizes) {
  const outputPath = path.join(outputDir, `icon-${size}.png`);
  await sharp(sourcePath)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(outputPath);
}

const icoBuffer = await pngToIco(
  await Promise.all(
    [16, 24, 32, 48, 64, 128, 256].map((size) =>
      readFile(path.join(outputDir, `icon-${size}.png`)),
    ),
  ),
);

await writeFile(path.join(outputDir, "app-icon.ico"), icoBuffer);
