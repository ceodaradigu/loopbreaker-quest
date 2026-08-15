import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.PORT ?? "4173", 10);
const clientRoot = fileURLToPath(new URL("../dist/client/", import.meta.url));
const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("preview", Date.now().toString());
const { default: worker } = await import(workerUrl.href);

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

async function writeResponse(incoming, outgoing, response) {
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  if (incoming.method === "HEAD") return outgoing.end();
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

async function assetResponse(request) {
  const url = new URL(request.url);
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const candidate = resolve(clientRoot, `.${pathname}`);
  if (!candidate.startsWith(clientRoot)) {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    if (!(await stat(candidate)).isFile()) throw new Error("Not a file");
    const body = await readFile(candidate);
    return new Response(body, {
      headers: {
        "cache-control": "no-store",
        "content-type": contentTypes.get(extname(candidate)) ?? "application/octet-stream",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const origin = `http://${host}:${port}`;
    const request = new Request(new URL(incoming.url ?? "/", origin), {
      method: incoming.method,
      headers: incoming.headers,
    });

    if (new URL(request.url).pathname !== "/") {
      const asset = await assetResponse(request);
      if (asset.status !== 404) return writeResponse(incoming, outgoing, asset);
    }

    const response = await worker.fetch(
      request,
      { ASSETS: { fetch: assetResponse } },
      { waitUntil() {}, passThroughOnException() {} },
    );

    await writeResponse(incoming, outgoing, response);
  } catch (error) {
    console.error(error);
    outgoing.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    outgoing.end("Preview server error");
  }
});

server.listen(port, host, () => {
  console.log(`Loopbreaker preview: http://${host}:${port}`);
});
