const fs = require("fs");
let model = fs.readFileSync("model.js", "utf8").replace(/\r\n/g, "\n");

// Already wrapped? skip
if (model.trimStart().startsWith("(function")) {
  console.log("already wrapped");
  process.exit(0);
}

const marker = "// Browser global for non-module script tags";
const idx = model.indexOf(marker);
if (idx !== -1) {
  model = model.slice(0, idx).trimEnd();
}

const wrapped = `(function (global) {
"use strict";
${model}

global.ReigerModel = {
  PROPERTIES,
  DEFAULTS,
  fmt,
  fmtPct,
  fmtX,
  solveStabilized,
  buildPhasedSchedule,
  sizeTakeout,
  runModel,
};
})(typeof window !== "undefined" ? window : globalThis);
`;

fs.writeFileSync("model.js", wrapped);
console.log("wrapped", wrapped.length);
