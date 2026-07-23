/**
 * Reiger Avenue - phased gut renovation + draw-based construction interest.
 * Reno order: 5210 -> 5206 -> 5204 -> 5200
 */

const TOTAL_BUILDING_SF = 16060;

/** Building SF allocated by unit share of 50 rentable rooms (PDF total 16,060 SF). */
const PROPERTIES = [
  { id: "5210", address: "5210 Reiger Ave", units: 9, order: 0 },
  { id: "5206", address: "5206 Reiger Ave", units: 9, order: 1 },
  { id: "5204", address: "5204 Reiger Ave", units: 21, order: 2 },
  { id: "5200", address: "5200 Reiger Ave", units: 11, order: 3 },
].map((p) => {
  const buildingSf = Math.round((TOTAL_BUILDING_SF * p.units) / 50);
  return { ...p, buildingSf, sfShare: buildingSf / TOTAL_BUILDING_SF };
});

// Fix rounding so SF sums exactly to 16,060
(function fixSf() {
  const sum = PROPERTIES.reduce((a, p) => a + p.buildingSf, 0);
  const delta = TOTAL_BUILDING_SF - sum;
  PROPERTIES[PROPERTIES.length - 1].buildingSf += delta;
  PROPERTIES.forEach((p) => {
    p.sfShare = p.buildingSf / TOTAL_BUILDING_SF;
  });
})();

const DEFAULTS = {
  purchasePrice: 1022000,
  closingHolding: 227400,
  renoPsf: 70,
  rentMonthly: 725,
  vacancyRate: 0.08,
  mgmtPct: 0.1,
  repairsPct: 0.05,
  reservePerUnitMo: 25,
  insuranceAnnual: 40000,
  waterMonthly: 800,
  otherUtilsMonthly: 200,
  electricAnnual: 27711,
  capRate: 0.09,
  taxRate: 0.02195,
  // Construction / bridge (draw-based - not Dutch)
  constrRate: 0.11,
  constrPoints: 0.03,
  renoMonthsEach: 5, // 4-6
  leaseUpMonths: 1,
  // Take-out permanent
  takeoutLtv: 0.75,
  takeoutRate: 0.0675,
  takeoutAmortYrs: 30,
  takeoutTermYrs: 10,
  minDscr: 1.25,
  refiClosingPct: 0.015,
};

function fmt(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n || 0);
}

function fmtPct(n, digits = 1) {
  return `${((n || 0) * 100).toFixed(digits)}%`;
}

function fmtX(n) {
  return `${(n || 0).toFixed(2)}x`;
}

function pmt(rate, nper, pv) {
  if (!nper) return 0;
  if (rate === 0) return pv / nper;
  return (rate * pv) / (1 - Math.pow(1 + rate, -nper));
}

function pvAnnuity(rate, nper, pmtAmt) {
  if (!nper) return 0;
  if (rate === 0) return pmtAmt * nper;
  return (pmtAmt * (1 - Math.pow(1 + rate, -nper))) / rate;
}

/**
 * Solve stabilized NOI with tax circularity:
 * taxes = (NOI / cap) * taxRate  ->  NOI = NOI_pre / (1 + taxRate/cap)
 */
function solveStabilized(assumptions, props = PROPERTIES) {
  const a = assumptions;
  const totalUnits = props.reduce((s, p) => s + p.units, 0);
  const gpr = totalUnits * a.rentMonthly * 12;
  const vacancy = gpr * a.vacancyRate;
  const egi = gpr - vacancy;

  const byProp = props.map((p) => {
    const gprP = p.units * a.rentMonthly * 12;
    const vacP = gprP * a.vacancyRate;
    const egiP = gprP - vacP;
    const electric = a.electricAnnual * p.sfShare;
    const water = a.waterMonthly * 12 * p.sfShare;
    const other = a.otherUtilsMonthly * 12 * p.sfShare;
    const insurance = a.insuranceAnnual * p.sfShare;
    const mgmt = egiP * a.mgmtPct;
    const repairs = egiP * a.repairsPct;
    const reserves = a.reservePerUnitMo * p.units * 12;
    const opexPreTax = mgmt + repairs + reserves + electric + water + other + insurance;
    return {
      ...p,
      gpr: gprP,
      vacancy: vacP,
      egi: egiP,
      electric,
      water,
      other,
      insurance,
      mgmt,
      repairs,
      reserves,
      opexPreTax,
    };
  });

  const opexPreTax = byProp.reduce((s, p) => s + p.opexPreTax, 0);
  const noiPreTax = egi - opexPreTax;
  const noi = noiPreTax / (1 + a.taxRate / a.capRate);
  const value = noi / a.capRate;
  const taxes = value * a.taxRate;

  byProp.forEach((p) => {
    p.taxes = taxes * p.sfShare;
    p.opex = p.opexPreTax + p.taxes;
    p.noi = p.egi - p.opex;
    p.monthlyRent = p.units * a.rentMonthly;
    p.monthlyEgi = p.egi / 12;
    p.monthlyNoi = p.noi / 12;
  });

  return {
    totalUnits,
    gpr,
    vacancy,
    egi,
    opexPreTax,
    taxes,
    opex: opexPreTax + taxes,
    noi,
    value,
    byProp,
  };
}

/**
 * Month-by-month construction schedule with draws and interest on drawn balance only.
 */
function buildPhasedSchedule(assumptions, props = PROPERTIES) {
  const a = assumptions;
  const ordered = [...props].sort((x, y) => x.order - y.order);
  const renoMos = Math.max(4, Math.min(6, Math.round(a.renoMonthsEach)));
  const leaseUp = Math.max(0, Math.round(a.leaseUpMonths));

  const phases = [];
  let cursor = 1; // month 1 starts first reno; month 0 = close

  for (const p of ordered) {
    const rehabBudget = p.buildingSf * a.renoPsf;
    const start = cursor;
    const end = start + renoMos - 1;
    const stabilizeMonth = end + leaseUp;
    const monthlyDraw = rehabBudget / renoMos;
    phases.push({
      ...p,
      rehabBudget,
      renoStart: start,
      renoEnd: end,
      stabilizeMonth,
      monthlyDraw,
      renoMonths: renoMos,
    });
    cursor = end + 1; // next building starts immediately after prior finishes
  }

  const lastStabilize = Math.max(...phases.map((p) => p.stabilizeMonth));
  const totalRehab = phases.reduce((s, p) => s + p.rehabBudget, 0);
  const projectCost = a.purchasePrice + totalRehab + a.closingHolding;

  // Commitment sized to project cost (lender max); actual interest only on draws
  const commitment = projectCost;
  const pointsFee = commitment * a.constrPoints;

  // Month 0 close draws: purchase + closing/holding + points (points often financed)
  const closeDraw = a.purchasePrice + a.closingHolding + pointsFee;

  const months = [];
  let drawn = 0;
  let cumulativeInterest = 0;
  let dutchInterest = 0;

  for (let m = 0; m <= lastStabilize + 2; m++) {
    let draw = 0;
    const drawNotes = [];

    if (m === 0) {
      draw = closeDraw;
      drawNotes.push("Close: purchase + closing/holding + points");
    }

    for (const ph of phases) {
      if (m >= ph.renoStart && m <= ph.renoEnd) {
        draw += ph.monthlyDraw;
        drawNotes.push(`${ph.id} reno draw ${m - ph.renoStart + 1}/${ph.renoMonths}`);
      }
    }

    drawn += draw;
    const interest = drawn * (a.constrRate / 12);
    cumulativeInterest += interest;
    // Dutch: interest on full commitment every month from day 1
    dutchInterest += commitment * (a.constrRate / 12);

    const online = phases.filter((p) => m >= p.stabilizeMonth);
    const gprMo = online.reduce((s, p) => s + p.units * a.rentMonthly, 0);
    const egiMo = gprMo * (1 - a.vacancyRate);

    months.push({
      month: m,
      draw,
      drawn,
      interest,
      cumulativeInterest,
      dutchInterest,
      dutchMonthInterest: commitment * (a.constrRate / 12),
      interestSavedVsDutch: dutchInterest - cumulativeInterest,
      gprMo,
      egiMo,
      onlineIds: online.map((p) => p.id),
      drawNotes,
      label:
        m === 0
          ? "Close"
          : phases.find((p) => m >= p.renoStart && m <= p.renoEnd)
            ? `Reno ${phases.find((p) => m >= p.renoStart && m <= p.renoEnd).id}`
            : online.length === phases.length
              ? "Stabilized"
              : "Lease-up",
    });
  }

  const payoff = drawn; // principal; interest paid current (from reserve / ops)
  const totalInterestDraw = cumulativeInterest;
  const totalInterestDutch = dutchInterest;
  const interestSavings = totalInterestDutch - totalInterestDraw;

  return {
    phases,
    months,
    renoMonthsEach: renoMos,
    lastStabilize,
    totalRehab,
    projectCost,
    commitment,
    pointsFee,
    closeDraw,
    peakDrawn: drawn,
    payoff,
    totalInterestDraw,
    totalInterestDutch,
    interestSavings,
  };
}

function sizeTakeout(noi, value, projectCost, payoff, assumptions) {
  const a = assumptions;
  const loanLtv = value * a.takeoutLtv;
  const maxDs = noi / a.minDscr;
  const moRate = a.takeoutRate / 12;
  const n = a.takeoutAmortYrs * 12;
  const loanDscr = pvAnnuity(moRate, n, maxDs / 12);
  const loan = Math.min(loanLtv, loanDscr);
  const monthlyPi = pmt(moRate, n, loan);
  const annualDs = monthlyPi * 12;
  const dscr = annualDs > 0 ? noi / annualDs : 0;
  const debtYield = loan > 0 ? noi / loan : 0;
  const ltv = value > 0 ? loan / value : 0;
  const ltc = projectCost > 0 ? loan / projectCost : 0;
  const refiClosing = loan * a.refiClosingPct;
  const equityReturned = loan - refiClosing - payoff;
  const remainingEquity = projectCost - payoff - Math.max(0, equityReturned);
  const cfad = noi - annualDs;
  const coc = remainingEquity > 0 ? cfad / remainingEquity : 0;

  return {
    loanLtv,
    loanDscr,
    loan,
    monthlyPi,
    annualDs,
    dscr,
    debtYield,
    ltv,
    ltc,
    refiClosing,
    equityReturned,
    remainingEquity,
    cfad,
    coc,
    binding: loanLtv <= loanDscr ? "LTV" : "DSCR",
  };
}

function runModel(overrides = {}) {
  const assumptions = { ...DEFAULTS, ...overrides };
  const stabilized = solveStabilized(assumptions);
  const schedule = buildPhasedSchedule(assumptions);
  // Payoff at take-out = peak drawn principal (interest paid current during hold)
  const takeout = sizeTakeout(
    stabilized.noi,
    stabilized.value,
    schedule.projectCost,
    schedule.peakDrawn,
    assumptions
  );

  const yieldOnCost = schedule.projectCost > 0 ? stabilized.noi / schedule.projectCost : 0;
  const valueCreation = stabilized.value - schedule.projectCost;

  return {
    assumptions,
    properties: PROPERTIES,
    stabilized,
    schedule,
    takeout,
    yieldOnCost,
    valueCreation,
  };
}

// Browser global for non-module script tags
if (typeof window !== "undefined") {
  window.ReigerModel = {
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
}
