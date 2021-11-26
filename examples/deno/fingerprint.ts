// deno-lint-ignore-file no-explicit-any
/**
 * Fingerprinted infomation template.
 *
 * @prop {Map<string,string>} properties: a map of device characteristics.
 * @prop {Set<string>} fonts: the set of all fonts not present on the device.
 * @prop {Header} headers: the http headers of the original request.
 */
export class Fingerprint {
    properties: Map<string, string>;
    fonts: Set<string>;
    headers?: Headers;

    constructor() {
        this.properties = new Map();
        this.fonts = new Set();
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

    toJSON(): string {
        return JSON.stringify({
            properties: [...this.properties],
            fonts: [...this.fonts],
            headers: [...(this.headers ?? [])],
        });
    }
}

/**
 * A record of a spesific device.
 *
 * @prop {number | Array<number>} time: the epoch timestamp of the original request.
 * @prop {Fingerprint} fingerprint: captured device fingerprint infomation
 */
export class DeviceRecord {
    timestamp: number;
    customProperties: Map<unknown, unknown>;
    fingerprint: Fingerprint;

    /**
     * Creates a new record object.
     *
     */
    constructor() {
        this.fingerprint = new Fingerprint();
        this.timestamp = new Date().getTime();
        this.customProperties = new Map();
    }

    insert(key: string, value: string): DeviceRecord {
        key == "font-name"
            ? this.fingerprint.fonts.add(value)
            : this.fingerprint.properties.set(key, value);
        return this;
    }
}

/**
 * The callback function to be run when charecteristics from a device have been collected.
 *
 * @param {string} ip: the ip that the requests were sent from.
 * @param {DeviceRecord} record: the record of the devices, eg: characteristics, headers, ect.
 *
 */
export interface Callback {
    (ip: string, record: DeviceRecord): void;
}

/**
 * A set of options
 *
 * @param {boolean|promise<boolean>} timeoutFunction: a function that checks for a certain condition.
 * If it is true, the device record will be passed onto the callback function, if it is false, it will wait the amount
 * of time spesified by timeout.
 * @param {number} timeout: the interval running the timeout function. Set to false if you do not wish for a timeout (this is not recommended)
 */
export interface Options {
    timeoutFunction?: (record: DeviceRecord) => boolean | Promise<boolean>;
    timeout?: number | boolean;
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
                timeoutFunction: () => true,
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
     * @param {string} key: the property to be set. Use "custom" to set a custom property in the DeviceRecord
     * @param {string|Array<unknown>} value: the value to be set.
     * When using a custom property, replace value with an array of signature: [key,value]
     * @param {number} time: (optional) the epoch time of the request.
     * @param {Headers} headers: (optional) the HTTP headers of the request.
     */

    private add(
        fn: (...args: any[]) => void,
        ip: string,
        ...args: any[]
    ): void {
        const record = this.data.get(ip);

        // if the record does not exist
        if (!record) {
            // Create a new record of this device
            this.data.set(ip, new DeviceRecord());
            // Run insert function
            fn(...args);

            // Timeout
            if (!(typeof this.options.timeout == "boolean"))
                new Promise((resolve) => {
                    // Call timeoutFunction every spesified timeout
                    const inter = setInterval(async () => {
                        if (
                            await (
                                this.options.timeoutFunction as (
                                    record: DeviceRecord
                                ) => boolean | Promise<boolean>
                            )(this.data.get(ip) as DeviceRecord)
                        ) {
                            clearInterval(inter);
                            resolve(undefined);
                        }
                    }, this.options.timeout as number);
                }).then(() => {
                    this.flush(ip);
                });
        } else {
            fn(...args);
        }
    }

    addHeader(ip: string, headers: Headers): void {
        this.add(
            (headers: Headers) => {
                (this.data.get(ip) as DeviceRecord).fingerprint.headers =
                    headers;
            },
            ip,
            headers
        );
    }

    /**
     * Insert a key/value pair into a record.
     *
     * @param {string} ip: the ip of the conenction.
     * @param {string} key: the property to be set.
     * @param {string} value: the value to be set.
     */
    insert(ip: string, key: string, value: string): void {
        this.add(
            (key, value) => {
                (this.data.get(ip) as DeviceRecord).insert(key, value);
            },
            ip,
            key,
            value
        );
    }

    /**
     * Insert a custom key/value pair into a record.
     * Pairs will be stored in the cusomProperties map.
     *
     * @param {string} ip: the ip of the conenction.
     * @param {string} key: the property to be set.
     * @param {string} value: the value to be set.
     */
    insertCustom(ip: string, key: string, value: string): void {
        this.add(
            (key, value) => {
                (this.data.get(ip) as DeviceRecord).customProperties.set(
                    key,
                    value
                );
            },
            ip,
            key,
            value
        );
    }

    /**
     * If IP exists, remove the record from storage and it pass onto the callback function.
     *
     * @param {string} ip: the ip of the record.
     */
    flush(ip: string): boolean {
        if (this.data.has(ip)) {
            this.callback(ip, this.data.get(ip) as DeviceRecord);
            this.data.delete(ip);
            return true;
        } else return false;
    }
}
