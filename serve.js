import http from "node:http";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(root, "data");
const registrationsFile = path.join(dataDir, "registrations.jsonl");
const basePort = Number(process.env.PORT || 5173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function readBody(request, limit = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error("Payload too large"));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function createServer() {
  return http.createServer(async (request, response) => {
    let pathname = "/";
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch {
      response.writeHead(400).end("Bad request");
      return;
    }

    if (pathname === "/api/register" && request.method === "POST") {
      try {
        const payload = JSON.parse((await readBody(request)).toString("utf8") || "{}");
        if (!payload || typeof payload.registrationId !== "string" || !payload.registrationId || !Array.isArray(payload.people) || !payload.people.length) {
          response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ ok: false, error: "Invalid registration payload." }));
          return;
        }
        const record = { receivedAt: new Date().toISOString(), registration: payload };
        await mkdir(dataDir, { recursive: true });
        await appendFile(registrationsFile, JSON.stringify(record) + "\n", "utf8");
        response.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" }).end(JSON.stringify({
          ok: true,
          registrationId: payload.registrationId,
          count: payload.people.length,
        }));
      } catch {
        response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ ok: false, error: "Could not read the registration. Please try again." }));
      }
      return;
    }

    if (request.method !== "GET") {
      response.writeHead(405).end("Method not allowed");
      return;
    }

    if (pathname.endsWith("/")) pathname += "index.html";
    const filePath = path.join(root, pathname);
    if (!filePath.startsWith(root)) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    try {
      const data = await readFile(filePath);
      response.writeHead(200, {
        "content-type": types[path.extname(filePath).toLowerCase()] || "application/octet-stream",
        "cache-control": "no-store",
      });
      response.end(data);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" }).end("Not found");
    }
  });
}

function start(port, attemptsLeft) {
  const server = createServer();
  server.once("error", (error) => {
    if (error.code === "EADDRINUSE" && attemptsLeft > 0) {
      start(port + 1, attemptsLeft - 1);
      return;
    }
    console.error(`Could not start the local server: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log("");
    console.log(`  Focus 2027 registration form`);
    console.log(`  ${url}`);
    console.log("");
    console.log("  Keep this window open while you use the form.");
    console.log("  Press Ctrl+C to stop.");
    console.log("");
    if (process.platform === "win32" && !process.env.NO_OPEN) exec(`start "" "${url}"`);
  });
}

start(basePort, 10);
