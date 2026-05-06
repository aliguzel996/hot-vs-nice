import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = 4173;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

createServer(async (request, response) => {
  try {
    const requestPath = request.url === "/" ? "/index.html" : request.url || "/index.html";
    const safePath = normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(root, safePath);
    const content = await readFile(filePath);
    const extension = extname(filePath);

    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}).listen(port, () => {
  console.log(`Vector Color Utility ready on http://localhost:${port}`);
});
