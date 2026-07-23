const fs = require("fs");

function asciiSafe(s) {
  return s
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\u2192/g, "->")
    .replace(/\u00d7/g, "x")
    .replace(/\u00b7/g, "|")
    .replace(/\u2019/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, "...");
}

let html = asciiSafe(fs.readFileSync("index.html", "utf8"));
const model = asciiSafe(fs.readFileSync("model.js", "utf8"));
const out = html.replace(
  '<script src="model.js"></script>',
  `<script>\n${model}\n</script>`
);

fs.writeFileSync("index.html", html, "utf8");
fs.writeFileSync("model.js", model, "utf8");
fs.writeFileSync("artifact.html", out, "utf8");
console.log("artifact bytes", Buffer.byteLength(out, "utf8"));
console.log("mojibake", out.includes("â€") || out.includes("Ã"));
