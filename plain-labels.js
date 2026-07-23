const fs = require("fs");
let h = fs.readFileSync("index.html", "utf8");

const reps = [
  ["Draw Interest", "Loan Draws"],
  ["Take-Out", "Bank Refinance"],
  [
    "OpEx at full stabilization allocated by building SF.",
    "Operating costs after renovation are split by each building's square footage.",
  ],
  ["Stabilized NOI", "Income after expenses"],
  ["Value @ Cap", "Appraised value"],
  ["Yield on Cost", "Return on total cost"],
  ["Cash Down @ Close", "Cash at closing"],
  ["Initial Mo. EGI (carry)", "Starting monthly rent collected"],
  ["Draw Interest (est.)", "Construction loan interest"],
  ["Saved vs Dutch", "Interest saved vs full-loan billing"],
  ["16,060 building SF", "16,060 sq ft"],
  ["not ADR / hotel RevPAR underwriting.", "not hotel nightly-rate underwriting."],
  ["an updated CO so", "an updated occupancy certificate so"],
  ["current CO language", "current occupancy certificate language"],
  ["Specific CO wording", "Specific occupancy certificate wording"],
  ["Bldg SF", "Sq ft"],
  ["Rehab $", "Rehab budget"],
  ["Reno Window", "Renovation months"],
  ["In-place GPR / mo", "Current rent / month"],
  ["Stab. GPR / mo", "Rent after reno / month"],
  [
    "Draw Schedule, Carry Income &amp; Interest",
    "Loan Draws, Rent During Renovation &amp; Interest",
  ],
  [
    "Monthly EGI reflects in-place carry on buildings not under gut (20% vacancy), $0 on the vacated reno building, and $725 rents at 10% vacancy once each building stabilizes. Cash after interest = EGI − that month's interest.",
    "Rent is collected on buildings not being renovated (about 20% vacancy). The building under renovation collects $0. Finished buildings collect $725/room at 10% vacancy. Cash after interest = rent collected minus that month's loan interest.",
  ],
  ["Sponsor Cash @ Close", "Your cash at closing"],
  ["Close Loan Draw", "Loan amount at closing"],
  ["Peak Drawn", "Highest loan balance"],
  ["Bridge Rate", "Construction loan rate"],
  [">Mo</th>", ">Month</th>"],
  ["Drawn Bal", "Loan balance"],
  ["EGI / mo", "Rent collected"],
  ["Blended Vac", "Vacancy"],
  ["EGI − Int", "Cash after interest"],
  ["EGI - Int", "Cash after interest"],
  ["Stabilized Operations by Building", "Income &amp; Expenses by Building"],
  ["Allocated by SF", "By square footage"],
  [
    "Fully stabilized: gross rent = units x $725 at <strong>10% vacancy</strong>. Management and R&amp;M follow each building's EGI. Electric, water, other utilities, insurance, and taxes are split by <strong>building SF share</strong>.",
    "After renovation: each room at $725 with <strong>10% vacancy</strong>. Management and repairs follow each building's rent. Electric, water, other utilities, insurance, and taxes are split by <strong>building square footage</strong>.",
  ],
  ["SF Share", "Share of sq ft"],
  [">GPR</th>", ">Potential rent</th>"],
  [">EGI</th>", ">Rent collected</th>"],
  ["Other Util", "Other utilities"],
  [">Ins</th>", ">Insurance</th>"],
  [">NOI</th>", ">Income after expenses</th>"],
  ["NOI / mo", "Per month"],
  ["Permanent Take-Out", "Permanent Bank Loan"],
  ["Post-Stabilization", "After renovation"],
  [
    "Loan sized to the lesser of LTV and DSCR against stabilized income value.",
    "Loan sized to the lower of loan-to-value and debt-coverage limits against stabilized income value.",
  ],
  [
    '<strong style="color:var(--ink2)">EGI is not cash flow after debt</strong> -\n          EGI is rent after vacancy; CF after debt = NOI − debt service (OpEx already taken out to get to NOI).',
    '<strong style="color:var(--ink2)">Rent collected is not cash in your pocket.</strong>\n          Rent collected minus operating costs = income after expenses. That minus the mortgage payment = cash after the loan.',
  ],
  ["Perm Loan", "Bank loan amount"],
  ["Binding Constraint", "What limits the loan"],
  [">DSCR</div>", ">Debt coverage</div>"],
  ["Debt Yield", "Income ÷ loan"],
  ["LTV / LTC", "Loan vs value / cost"],
  ["Equity @ Refi", "Cash back at refinance"],
  ["Stabilized Cash Waterfall (Annual)", "Where the money goes each year"],
  ["EGI (annual)", "Rent collected (year)"],
  ["− OpEx (annual)", "− Operating costs (year)"],
  ["= NOI (annual)", "= Income after expenses (year)"],
  ["− Debt Service (annual)", "− Mortgage payment (year)"],
  ["= CF After Debt (annual)", "= Cash after the loan (year)"],
  ["CF After Debt / mo", "Cash after the loan / month"],
  [
    "Amber line = EGI minus bridge interest; dashed green = permanent CF after debt / mo after take-out.",
    "Amber line = rent collected minus construction-loan interest. Dashed green = cash after the permanent bank loan each month.",
  ],
  ["its NOI begins offsetting carry", "its income begins offsetting carry"],
  [
    "active building's SF x $/SF budget.",
    "active building's square footage × rehab cost per foot.",
  ],
  [
    "Take-out underwrites to stabilized NOI at a market cap, with LTV and DSCR gates you can stress in the controls.",
    "The bank loan is based on stabilized income at a market cap rate. You can stress-test loan-to-value and debt coverage in the controls.",
  ],
  ["Max LTV (%)", "Max loan as % of value"],
  ["Min DSCR", "Minimum debt coverage (e.g. 1.25)"],
  ["Cap rate — exit / take-out (%)", "Cap rate for value / refinance (%)"],
  ["Cap rate - exit / take-out (%)", "Cap rate for value / refinance (%)"],
  ["Take-Out Loan", "Permanent Bank Loan"],
  ["Electric / mo portfolio ($)", "Electric / month (all buildings)"],
  ["Water / mo portfolio ($)", "Water / month (all buildings)"],
  ["Other utils / mo ($)", "Other utilities / month"],
  ["Insurance annual ($)", "Insurance / year"],
  ["Initial mo. EGI (in-place carry)", "Starting monthly rent collected"],
  ["Draw interest (carry period)", "Construction loan interest"],
  ["Interest saved vs Dutch", "Interest saved vs full-loan billing"],
  ["Est. take-out loan", "Estimated bank refinance loan"],
  ["Peak construction balance", "Highest construction loan balance"],
  ["Close loan draw", "Loan amount at closing"],
  ["Sponsor cash (", "Your cash at closing ("],
  ["Rehab draws (later)", "Renovation draws (later)"],
  ["Monthly EGI (carry)", "Monthly rent collected"],
  ["Annual NOI", "Income after expenses"],
  ["Annual EGI", "Rent collected"],
  ["Monthly EGI (ramp -> plateau)", "Monthly rent collected"],
  ["EGI - bridge interest / mo", "Rent minus construction interest"],
  ["Perm CF after debt / mo", "Cash after bank loan / month"],
  [
    "Stabilized hold - EGI plateau after full reno.",
    "After full renovation — rent levels off.",
  ],
  [
    "All buildings online — full stabilization.",
    "All buildings finished and rented.",
  ],
  ["Chart runs through the reno ramp, then", "This chart runs through renovation, then"],
  [">Bank Refinance</a>", ">Refinance</a>"],
];

let missing = [];
for (const [a, b] of reps) {
  if (!h.includes(a)) missing.push(a.slice(0, 60));
  h = h.split(a).join(b);
}

fs.writeFileSync("index.html", h);
console.log("written", h.length);
console.log("missing count", missing.length);
missing.slice(0, 20).forEach((m) => console.log("?", m));
