import path from "node:path";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = process.cwd();
const releaseDir = path.join(rootDir, "release");
const webRootDir = path.join(releaseDir, "web");
const targetDir = path.join(webRootDir, "hot-vs-nice");

await execFileAsync("npm.cmd", ["run", "build:icons"], { cwd: rootDir, shell: true });

await rm(targetDir, { recursive: true, force: true });
await mkdir(targetDir, { recursive: true });

for (const entry of [
  "index.html",
  "styles.css",
  "src",
  "assets",
  "metadata",
  "app.manifest.json",
  "AI.md",
  "CHANGELOG.md",
  "llms.txt",
]) {
  await cp(path.join(rootDir, entry), path.join(targetDir, entry), { recursive: true });
}

await writeFile(
  path.join(targetDir, "DEPLOY.txt"),
  [
    "Upload the entire hot-vs-nice folder to your cPanel public directory.",
    "Open /hot-vs-nice/index.html after upload.",
    "This build is static and keeps relative paths intact.",
  ].join("\n"),
  "utf8",
);
