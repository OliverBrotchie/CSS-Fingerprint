import { serve, ServerRequest } from "https://deno.land/std/http/server.ts";
import { extname } from "https://deno.land/std/path/mod.ts";
import { existsSync } from "https://deno.land/std/fs/mod.ts";
import { pathToRegexp } from "https://raw.githubusercontent.com/pillarjs/path-to-regexp/master/src/index.ts";
import { ConnectionHandler } from "../../../index.ts";
import { defaultFonts } from "./default-font-list.ts";

const handler = new ConnectionHandler((x, y, z) => {
    // Get the correct fonts
    x?.calculateFonts(defaultFonts);

    console.log("Time stamp: " + z);
    console.log(x);
});

const cssRegex = pathToRegexp("/some/url/\\?:key=:value");
const MEDIA_TYPES: Record<string, string> = {
    ".md": "text/markdown",
    ".html": "text/html",
    ".htm": "text/html",
    ".json": "application/json",
    ".map": "application/json",
    ".txt": "text/plain",
    ".ts": "text/typescript",
    ".tsx": "text/tsx",
    ".js": "application/javascript",
    ".jsx": "text/jsx",
    ".gz": "application/gzip",
    ".css": "text/css",
    ".wasm": "application/wasm",
    ".mjs": "application/javascript",
    ".svg": "image/svg+xml",
};

// Create a vanilla web-server
const PORT = 8080;
const server = serve({ port: 8080 });

console.clear();
console.log(`🚀 Server is running on http://localhost:${PORT}`);

for await (const req of server) {
    const connection = req.conn.remoteAddr as Deno.NetAddr;

    // Handle the css requests first as they will be the greatest number of requests
    const match = cssRegex.exec(req.url);
    if (match) {
        handler.insert(
            `${connection.hostname}`,
            match[1],
            match[2],
            req.headers
        );

        try {
            req.respond({ status: 200 });
        } catch (e) {}
    } else {
        // Handle file requests and errors
        if (req.url == "/") {
            console.log("Connection from: " + connection.hostname);
            serveFile(req, `./index.html`);
        } else if (
            !req.url.includes("..") &&
            req.url.substr(0, 7) == "/files/" &&
            existsSync(`./${req.url}`)
        ) {
            serveFile(req, `./${req.url}`);
        } else
            try {
                req.respond({
                    body: "This content does not exist!",
                    status: 404,
                });
            } catch (e) {}
    }
}

/**
 * Serve a file at a given path (Taken from fileserver example)
 * @param req The server request context used to cleanup the file handle
 * @param filePath Path of the file to serve
 */
async function serveFile(req: ServerRequest, filePath: string) {
    const [file, fileInfo] = await Promise.all([
        Deno.open(filePath),
        Deno.stat(filePath),
    ]);
    const headers = new Headers();
    headers.set("content-length", fileInfo.size.toString());
    const contentTypeValue = contentType(filePath);
    if (contentTypeValue) {
        headers.set("content-type", contentTypeValue);
    }
    req.done.then(() => {
        file.close();
    });

    try {
        req.respond({
            status: 200,
            body: file,
            headers,
        });
    } catch (e) {}
}

/** Returns the content-type based on the extension of a path. */
function contentType(path: string): string | undefined {
    return MEDIA_TYPES[extname(path)];
}
