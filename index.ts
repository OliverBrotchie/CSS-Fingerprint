/**
 * Fingerprinted infomation template.
 *
 * @prop {Map<string,string>} properties: a map of device characteristics.
 * @prop {Set<string>} fonts: the set of all fonts not present on the device.
 * @prop {Header} headers: the http headers of the original request.
 */
export class Fingerprint {
    properties: Map<string, string> = new Map();
    fonts: Set<string> = new Set();
    headers?: Headers;

    constructor(key: string, value: string, headers?: Headers) {
        key == "font-name"
            ? this.fonts.add(value)
            : this.properties.set(key, value);
        if (headers) this.headers = headers;
    }

    /**
     * Gets the fonts stored on the device.
     * Every font not installed on device will send a request to the server, and,
     * by comparing differences between the requests and the full list of fonts, we can draw conclusions about what fonts are installed.
     *
     * @param {Set<string> | Array<string>} fullList: the full list of fonts to compare against.
     */
    calculateFonts(fullList: Set<string> | Array<string>): void {
        this.fonts = new Set(
            [...fullList].filter((e) => {
                return !this.fonts.has(e);
            })
        );
    }
}

/**
 * A record of a spesific device.
 *
 * @prop {number | Array<number>} time: the epoch timestamp of the original request.
 * @prop {Fingerprint} fingerprint: captured device fingerprint infomation
 */
export class DeviceRecord {
    time: number = new Date().getTime();
    fingerprint: Fingerprint;

    /**
     * Creates a new record object.
     *
     * @param {string} key: a property to be set.
     * @param {string} value: a value to be set.
     * @param {number} time: the epoch timestamp of the original request.
     * @param {Headers} headers: the http headers of the original request.
     */
    constructor(key: string, value: string, headers?: Headers) {
        this.fingerprint = new Fingerprint(key, value, headers);
    }
}

/**
 * The callback function to be run when charecteristics from a device have been collected.
 *
 * @param {Fingerprint} fingerprint: the device characteristics, headers, ect.
 * @param {string} ip: the ip that the requests were sent from.
 * @param {number} timestamp: the timestamp of the first request
 */
export interface Callback {
    (fingerprint?: Fingerprint, ip?: string, time?: number): void;
}

/**
 * A set of options
 *
 * @param {number} timeout: length of time from the first request recieved until data will be passed to the callback function.
 */
export interface Options {
    timeout?: number;
}

/**
 * The connection-handler collates incomming requests and runs a given callback function after a spesified timeout period.
 *
 * @prop {Options} options: a set of options to be used by the connection handler.
 * @method insert: Insert infomation about a connection.
 */
export class ConnectionHandler {
    private data: Map<string, DeviceRecord>;
    private callback: Callback;
    options: Options;

    /**
     * Creates a new connection handler.
     *
     * @param {Callback} callback: the callback function to be run.
     * @param {Options} options: (optional) a set of options.
     */
    constructor(callback: Callback, options?: Options) {
        // Merge options with default options
        this.options = Object.assign(
            {
                timeout: 10000,
            },
            options
        );
        this.callback = callback;
        this.data = new Map<string, DeviceRecord>();
    }

    /**
     * Insert infomation about a connection.
     *
     * @param {string} ip: the ip of the conenction.
     * @param {string} key: the property to be set.
     * @param {string} value: the value to be set.
     * @param {number} time: (optional) the epoch time of the request.
     * @param {Headers} headers: (optional) the HTTP headers of the request.
     */
    insert(ip: string, key: string, value: string, headers?: Headers): void {
        const record = this.data.get(ip);

        // if the record does not exist
        if (!record) {
            // Create a new record of this device
            this.data.set(ip, new DeviceRecord(key, value, headers));

            // Wait the spesified timeout period and then run the callback function
            setTimeout(() => {
                this.callback(
                    this.data.get(ip)?.fingerprint,
                    ip,
                    this.data.get(ip)?.time
                );
                this.data.delete(ip);
            }, this.options.timeout);
        } else {
            if (key == "font-name") record.fingerprint.fonts.add(value);
            else record.fingerprint.properties.set(key, value);
        }
    }
}

/**
 * Stub.
 */
export function calculateEntropy(): number {
    return 0;
}
