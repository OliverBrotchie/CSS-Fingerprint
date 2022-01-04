<br/>

<img src="/img/logo.svg" height="150" width="675" margin="30px"/>

#

<br/>

**An experimental method for CSS based fingerprinting and a pure CSS 'supercookie'.**

### Links:

- [Live Demonstration](https://csstracking.dev)
- [Study Repository](https://github.com/OliverBrotchie/CSS-Fingerprint-Study)

## Contents

- [Contents](#contents)
- [What is it?](#what-is-it)
- [How does it work?](#how-does-it-work)
- [CSS Cookie](#css-cookie)
- [Why is this important?](#why-is-this-important)
- [Examples](#examples)
- [Calculating Device Uniqueness](#calculating-device-uniqueness)
  - [Example](#example)
- [Improvements and Further Research](#improvements-and-further-research)
  - [NoScript Detection](#noscript-detection)
  - [Attribute Profiling](#attribute-profiling)
  - [Async Loading and JS Interaction](#async-loading-and-js-interaction)
  - [OS and Browser Detection](#os-and-browser-detection)
  - [XSS Attacks](#xss-attacks)
- [Contributing](#contributing)
- [License](#license)

## What is it?

CSS Fingerprinting is a technique of tracking and gathering information on site visitors. 
This method exploits the nature of CSS to collect various characteristics about the visitor's 
browser and device, which can later be used to either identify or track said visitor.

## How does it work?

By sending a variety of media queries that apply to specific browser characteristics, 
the browser will select a set of styles that apply to itself. We then trick the browser 
into sending this information back to the server by setting the background-image of these 
styles to a specific URL. The server will then respond with HTTP Status 410 (Gone) to 
avoid any requests of these characteristics on subsequent reloads.

**For example, to detect the type of pointer input:**

```css

.pointer {
  background-image: url('/some/url/pointer=none');
}

// Coarse (touchscreen)
@media (any-pointer: coarse) {
  .pointer {
    background-image: url('/some/url/pointer=coarse');
  }
}

// Fine (mouse)
@media (any-pointer: fine) {
  .pointer {
    background-image: url('/some/url/pointer=fine');
  }
}

```
          
**Installed fonts can also be detected in a similar manner:**

```css

@font-face {
  font-family: 'some-font';
  src: local(some font), url('some/url/some-font');
}

.some-font {
  font-family:'some-font';
  view raw;
}

```

However, this works a little differently; every font not installed on device will send a 
request. By comparing the differences between the requests and the full list of fonts, we can
conclude what fonts are installed.

## CSS Cookie

We can also track visitors cross-origin by requesting an endpoint on the server 
that will return a permanent redirect (HTTP status 308) to a unique address. The browser will
then permanently make requests to the previously generated unique address whenever the endpoint 
is requested. This creates a pure CSS cookie that is reminisent of the '[supercookie](https://supercookie.me/)' exploit. This cookie is stored for an unlimited amount of time; the only way to remove it
is to fully clear the browser's cache.

<img src="/img/diagram.png" title="Diagram of 308 redirect" width="500" height="400" />
                    
## Why is this important?

This technique avoids anti-tracking methods such as NoScript, VPNs or browser extensions, as it
requires no Javascript or Cookies to function.

Currently, this method is not scalable as it requires over 1MB of CSS downloads and hundreds of 
requests per user. However, with the next upcoming draft of the CSS specification, 
[CSS Values 4](https://www.w3.org/TR/css-values-4/), it may dramatically shrink the
number of requests per user by allowing the use of custom variables in URLs.

```css

.body {
  --unique-identifier: 'foo'; // unique generated ID
  --pointer: 'none';
  --theme-preference: 'none';
  
  // Only make one request
  background-image: url("/some/url/?" + var(--unique-identifier) + "&" + var(--pointer) + "&" + var(--theme-preference));
}

// Detect pointer type and theme
@media (any-pointer: coarse){
  body {
    --pointer: 'coarse';
  }
}

@media (prefers-color-scheme: dark) {
  body {
    --theme-preference: 'dark';
  }
}

```       
                    
Not only will the upcoming draft make this method scalable, but it will also increase its precision. 
Currently, without alternative means, it is hard to conclusively link every request to a specific visitor
as the only feasible way to determine their origin is to group the requests by the IP address of 
the connection. However, with the new draft, by generating a randomized string and interpolating 
it into the URL tag for every visitor, we can accurately identify all requests from said visitor.

## Examples

Included in this repository you will find an implementation of CSS Fingerprinting using the old
method, [fingerprint.sass](/fingerprint.sass), and an example of how to instantiate it, [example.sass](/example.sass).

You can find examples of different css-tracking servers in the [examples](/examples) directory.

To see a complete example (HTML/CSS/Server) check  out the [study repository](https://github.com/OliverBrotchie/CSS-Fingerprint-Study).


## Calculating Device Uniqueness

Shannon Entropy is used to quantify how identifiable fingerprint is. Let H be the entropy, X a discrete 
random variable with possible values `{x1,..., xn }` and `P(X)` a probability mass function. 

Shannon Entropy takes the following formula:

<img src="https://render.githubusercontent.com/render/math?math=H(x) = -\sum_{i}{P(x_i)log_bP(x_i)}" />

The entropy of Shannon is in bits where b = 2. One bit of entropy reduces by half the probability 
of an event occurring.

### Example

**Rust**

```rs

type Fingerprint<'a> = Vec<(&'a str, &'a str)>;
type DataSet<'a> = Vec<Fingerprint<'a>>;

fn shannon_entropy(data: DataSet, value: usize) -> f64 {

    let key_occurances = data
        .iter()
        .flatten()
        .fold(HashMap::new(), |mut acc, &(key, _)| {
            *acc.entry(key).or_insert(0) += 1;
            acc
        });

    let kv_occurances = data
        .iter()
        .flatten()
        .fold(HashMap::new(), |mut acc, &(key, val)| {
            *acc.entry((key, val)).or_insert(0) += 1;
            acc
        });

    let mut entropy = 0.0;

    for kv in &data[value] {
        let p = *kv_occurances.get(kv).unwrap() as f64 / *key_occurances.get(kv.0).unwrap() as f64;
        entropy -= p * p.log2();
    }

    entropy
}

```

## Improvements and Further Research

A set of performance and accuracy improvements that could be made to the method.

### NoScript Detection

Whilst many privacy browsers such as Brave will attempt to mask the use of NoScript to avoid fingerprinting,
these attempts could be thwarted by applying styles that will only be rendered in `noscript` tags:

```html

<noscript>
  <p style='background-image: url("/some/url/noscript=true")'>
    NoScript Detected
  </p>
</noscript>


```

### Attribute Profiling

Currently the `fingerprinting.sass` example will test all values between one and an arbitrary limit.
This method is highly inefficient and a little inaccurate.

**For example:** CSS pixels in actuality are split into fractions when resolved by the browser and hence two devices
with similar, but non-identical dimensions will be counted as the same.

Not only does this method cause inaccuracy but it also is inefficient.
Most devices can be grouped into categories of similar dimensions.
In the case of phones and tablets the differences between their dimensions will be extremely small and a higher
accuracy is needed to identify the differences. However, there large gaps in size between the different groups (for example between Tablet and Desktop resolutions), which means there is little need for accurate testing between those ranges.

**Further Research:** 
Determine the optimal precision parameters for both intra and inter group testing.

### Async Loading and JS Interaction

Through the use of Javascript, we can do several things to improve the accuracy and 
performance of this technique:

- **Delayed/Async Loading** - By delaying the loading of fingerprinting files with JS, we can ensure 
that the browser loads the rest of the page before these files, improving page responsiveness.
- **Sharding** - By splitting the fingerprinting files into component groups we can again reduce the 
performance cost by downloading them in parallel.
- **Conditional Execution** - Sharding the files, also opens the possibility of conditional execution.
If a fingerprint can be uniquely identified by a subset of shards, there is no need to burden the server
with the overhead of loading the full set.

**Further Research:**
Develop standardised sharding and conditional execution practices to improve performance and reduce 
server load.

### OS and Browser Detection

Most operating systems ship with a certain set of default fonts and display configurations.
By testing a subset of known default fonts that are included on different operating systems, 
we can, with a certain degree of confidence, determine which OS is installed on the device.

If this could be implemented it would dramatically reduce the number of requests per user
as font-detection is the most costly part of the process.

**Further Research:**
Determine a standardized subset to test for. This set should test for the key differences between
the defualts of different operating systems.

### XSS Attacks

If user generated CSS is displayed on websites it may give attackers the ability to track other visitors.

## Contributing

If you have any problems, changes or additions, please just open an issue or pull request!

## License

All content is licensed under the [MIT license](https://mit-license.org/) and is purely for educational purposes.
