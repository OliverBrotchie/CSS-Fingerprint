// Get font list and convert into css
console.log("Getting fonts... 💭");
let json = (
    await fetch(
        "https://raw.githubusercontent.com/fontsource/fontsource/main/FONTLIST.json"
    )
).json();

console.log("Converting to a Sass variable... ✍");
console.log(
    `$font-array: [${Object.keys(await json)
        .map((e, i) => {
            return `['${e.split("-").join(" ")}','${e}']`;
        })
        .join(", ")}]`
);
