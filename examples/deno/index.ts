import { ConnectionHandler } from "./fingerprint.ts";
import { defaultFonts } from "./default-font-list.ts";
import { startService } from "./server.ts";
import { query } from "./db.ts";

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

// Create a vanilla web-server
const PORT = 8000;

console.clear();
console.log(`🚀 Server is running on http://localhost:${PORT}`);

startService(PORT, handler);
