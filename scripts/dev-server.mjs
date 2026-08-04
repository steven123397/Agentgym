import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT ?? 3000);
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const resolveRequestPath = (pathname) => {
  const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
  const candidate = normalize(join(root, relativePath));
  return candidate.startsWith(root) ? candidate : null;
};

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", `http://${request.headers.host}`).pathname;
  const filePath = resolveRequestPath(decodeURIComponent(pathname));

  if (!filePath || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not Found");
    return;
  }

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": contentTypes[extname(filePath)] ?? "application/octet-stream",
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Agentgym baseline running at http://127.0.0.1:${port}`);
});