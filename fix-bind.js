const fs = require("fs");
let h = fs.readFileSync("index.html", "utf8");

h = h.replace(
  "setText('t-bind', t.binding);",
  "setText('t-bind', t.binding === 'LTV' ? 'Loan-to-value' : 'Debt coverage');"
);

// Catch remaining takeout note if em-dash variant survived
h = h.replace(
  /EGI is not cash flow after debt[\s\S]*?to get to NOI\)\./,
  'Rent collected is not cash in your pocket.</strong>\n          Rent collected minus operating costs = income after expenses. That minus the mortgage payment = cash after the loan.'
);

const checks = ["GPR", "EGI", "NOI", "DSCR", "LTV", "OpEx", "RevPAR", "ADR"];
for (const x of checks) {
  const re = new RegExp(`>[^<]*${x}[^<]*<`, "g");
  const hits = h.match(re) || [];
  if (hits.length) console.log(x, hits.slice(0, 5));
}

fs.writeFileSync("index.html", h);
console.log("patched");
