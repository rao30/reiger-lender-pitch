const fs = require("fs");
const content = fs.readFileSync("artifact.html", "utf8");
const bun = `const html = ${JSON.stringify(content)};
export default {
  async fetch() {
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  },
};
`;
fs.writeFileSync("railway-function.ts", bun, "utf8");
console.log("function bytes", Buffer.byteLength(bun, "utf8"));
