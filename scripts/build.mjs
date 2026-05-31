import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = process.cwd();
const dist = join(root, "dist");
const files = [
  "index.html",
  "admin.html",
  "styles.css",
  "admin.css",
  "shared.js",
  "app.js",
  "admin.js",
  "_headers"
];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of files) {
  await copyFile(join(root, file), join(dist, file));
}
