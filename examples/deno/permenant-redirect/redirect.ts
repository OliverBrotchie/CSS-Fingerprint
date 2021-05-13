import { serve } from "https://deno.land/std/http/server.ts";
import { pathToRegexp } from "https://raw.githubusercontent.com/pillarjs/path-to-regexp/master/src/index.ts";
import { ConnectionHandler } from "../../../index.ts";

const handler = new ConnectionHandler((x, y, z) => {
    console.log(x);
    console.log("ip: " + y);
    console.log("time-stamp: " + z);
});

const redirects: Set<string> = new Set();
const RedirectRegex = pathToRegexp("/some/url/:key=:value");
const cssRegex = pathToRegexp("/redirect/some/url/:key=:value");

const PORT = 8080;
const server = serve({ port: 8080 });

console.log(`🚀 Server is running on http://localhost:${PORT}`);

for await (const req of server) {
    const connection = req.conn.remoteAddr as Deno.NetAddr;
    const redirect = RedirectRegex.exec(req.url);
    if (redirect) {
        redirects.add((req.conn.remoteAddr as Deno.NetAddr).hostname);
        console.log("New visitor!");

        // Do something when visitor is new

        req.respond({
            status: 308, // Permenant redirect
            headers: new Headers([["Location", `/redirect/${redirect[0]}`]]),
        });
    } else {
        const match = cssRegex.exec(req.url);
        if (match) {
            if (!redirects.delete(connection.hostname)) {
                console.log("Previous visitor!");

                //Do something when visitor is not new
            }

            handler.insert(
                `${connection.hostname}:${connection.port}`,
                match[1],
                match[2],
                req.headers
            );
            req.respond({ body: JSON.stringify(match) });
        }
    }
}
