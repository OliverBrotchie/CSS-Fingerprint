const express = require("express");
const { ConnectionHandler } = require("./fingerprint.js");

const app = express();
const PORT = 8000;
const handler = new ConnectionHandler((ip, record) => {
    /**
     * Do something after a record has been collected.
     *
     * Note the fonts stored in the record are all fonts not found
     * on the device. Find the difference between default-font-list
     * and the fonts stored in the record.
     *
     **/
    console.log(`IP: ${ip}, has been fingerprinted.`);
});

// Permenant redirect to unique address
app.get("/some/url/308", (_, res) => {
    res.status(308)
        .header("location", `/some/url/308=${random16Chars()}`)
        .send();
});

// Insert properties into connection handler
app.get("/some/url/:key=:value", (req, res) => {
    const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

    handler.insert(ip, req.params.key, req.params.value);
    if (req.params.key === "308") {
        res.status(418).send("I'm a teapot");
        handler.addHeader(ip, req.headers);
    } else res.status(410).send("Gone"); // 410 Gone - reduces repeat requests
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

// Generate a random 16 character string
function random16Chars() {
    return Array(16)
        .fill(0)
        .map(() => {
            return Math.ceil(Math.random() * 35).toString(36);
        })
        .join("");
}
