<img src="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fmaxcdn.icons8.com%2FShare%2Ficon%2FLogos%2Fcss31600.png&f=1&nofb=1" title="CSS Fingerprint Icon" width="200" height="200" />

# CSS Fingerprint

**An experimental libary for CSS based fingerprinting.**

### **Links**

-   [Live Demonstration]()
-   [Experiment Server Repository](https://github.com/OliverBrotchie/CSS-Fingerprint)

---

### Contents

---

## How this works

---

## Installation

**NPM**

```bash
npm install css-fingerprint
```

---

## Basic Usage

### Front End:

See [examples](https://github.com/OliverBrotchie/CSS-Fingerprint/tree/main/examples) on how to instanciate the HTML and CSS/SASS.

### **Back End:**

**Deno**

```tsx
// Create a new connection handler
const handler = new ConnectionHandler((fingerprint, ip, timestamp) => {
    // Callback function to be run after the timeout

    // Get the correct fonts
    fingerprint?.calculateFonts(defaultFonts);

    // Do something
});

// Insert new fingerprinted characteristics
handler.insert(
    "192.168.0.0", //Some IP
    match[1],
    match[2],
    req.headers
);
```
