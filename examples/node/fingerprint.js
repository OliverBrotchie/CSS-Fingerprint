/**
 * Fingerprinted infomation template.
 *
 * @prop {Map<string,string>} properties: a map of device characteristics.
 * @prop {Set<string>} fonts: the set of all fonts not present on the device.
 * @prop {Header} headers: the http headers of the original request.
 */
class Fingerprint {
    properties;
    fonts;
    headers;

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
    calculateFonts(fullList) {
        this.fonts = new Set(
            [...fullList].filter((e) => {
                return !this.fonts.has(e);
            })
        );
    }

    toJSON() {
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
class DeviceRecord {
    timestamp;
    customProperties;
    fingerprint;

    /**
     * Creates a new record object.
     *
     */
    constructor() {
        this.fingerprint = new Fingerprint();
        this.timestamp = new Date().getTime();
        this.customProperties = new Map();
    }

    insert(key, value) {
        key == "font-name"
            ? this.fingerprint.fonts.add(value)
            : this.fingerprint.properties.set(key, value);
        return this;
    }
}

/**
 * The connection-handler collates incomming requests and runs a given callback function after a spesified timeout period.
 *
 * @prop {Options} options: a set of options to be used by the connection handler.
 * @method insert: Insert infomation about a connection.
 */
class ConnectionHandler {
    data;
    callback;
    options;

    /**
     * Creates a new connection handler.
     *
     * @param {Function} callback: the callback function to be run.
     * @param {Options} options: (optional) a set of options.
     */
    constructor(callback, options) {
        // Merge options with default options
        this.options = Object.assign(
            {
                timeoutFunction: () => true,
                timeout: 10000,
            },
            options
        );
        this.callback = callback;
        this.data = new Map();
    }

    /**
     * PRIVATE - Use insert, insertCustom or addHeader to add values.
     *
     * Insert infomation about a connection.
     *
     * @param {string} ip: the ip of the conenction.
     * @param {string} key: the property to be set. Use "custom" to set a custom property in the DeviceRecord
     * @param {string|Array<unknown>} value: the value to be set.
     * When using a custom property, replace value with an array of signature: [key,value]
     * @param {number} time: (optional) the epoch time of the request.
     * @param {Headers} headers: (optional) the HTTP headers of the request.
     */
    add(fn, ip, ...args) {
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
                            await this.options.timeoutFunction(
                                this.data.get(ip)
                            )
                        ) {
                            clearInterval(inter);
                            resolve(undefined);
                        }
                    }, this.options.timeout);
                }).then(() => {
                    this.flush(ip);
                });
        } else {
            fn(...args);
        }
    }

    /**
     *  Add headers to a record.
     * @param {string} ip
     * @param {Headers} headers
     */
    addHeader(ip, headers) {
        this.add(
            (headers) => {
                this.data.get(ip).fingerprint.headers = headers;
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
    insert(ip, key, value) {
        this.add(
            (key, value) => {
                this.data.get(ip).insert(key, value);
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
    insertCustom(ip, key, value) {
        this.add(
            (key, value) => {
                this.data.get(ip).customProperties.set(key, value);
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
    flush(ip) {
        if (this.data.has(ip)) {
            this.callback(ip, this.data.get(ip));
            this.data.delete(ip);
            return true;
        } else return false;
    }
}

module.exports = {
    ConnectionHandler,
};
