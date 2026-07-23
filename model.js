(function (global) {
"use strict";
/**
 * Reiger Avenue - phased gut renovation + draw-based construction interest.
 * Reno order: 5210 -> 5206 -> 5204 -> 5200
 *
 * Carry: only the building under gut is vacated. Others keep in-place rents
 * at initial vacancy (~20%), then step to stabilized rent/vacancy after reno.
 */

const TOTAL_BUILDING_SF = 16060;

/** In-place monthly GPR (100% occupied) from corrected rent rolls. */
const PROPERTIES = [
  { id: "5210", address: "5210 Reiger Ave", units: 9, order: 0, currentGprMonthly: 5327 },
  { id: "5206", address: "5206 Reiger Ave", units: 9, order: 1, currentGprMonthly: 5210 },
  { id: "5204", address: "5204 Reiger Ave", units: 21, order: 2, currentGprMonthly: 13353 },
  { id: "5200", address: "5200 Reiger Ave", units: 11, order: 3, currentGprMonthly: 5579 },
].map((p) => {
  const buildingSf = Math.round((TOTAL_BUILDING_SF * p.units) / 50);
  return { ...p, buildingSf, sfShare: buildingSf / TOTAL_BUILDING_SF };
});

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
  // Vacancy path: current portfolio ~20% -> 10% once renovated/stabilized
  vacancyInitial: 0.2,
  vacancyStabilized: 0.1,
  mgmtPct: 0.1,
  repairsPct: 0.05,
  reservePerUnitMo: 25,
  insuranceAnnual: 40000,
  waterMonthly: 800,
  otherUtilsMonthly: 200,
  electricMonthly: 2309, // ~$27,711/yr Dallas seasonal model
  capRate: 0.08,
  taxRate: 0.02195,
  // Equity / construction
  equityDownPct: 0.3, // 30% down at closing (on purchase)
  constrRate: 0.11,
  constrPoints: 0.03,
  renoMonthsEach: 5,
  leaseUpMonths: 1,
  // Take-out
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

function solveStabilized(assumptions, props = PROPERTIES) {
  const a = assumptions;
  const vac = a.vacancyStabilized;
  const totalUnits = props.reduce((s, p) => s + p.units, 0);
  const gpr = totalUnits * a.rentMonthly * 12;
  const vacancy = gpr * vac;
  const egi = gpr - vacancy;

  const byProp = props.map((p) => {
    const gprP = p.units * a.rentMonthly * 12;
    const vacP = gprP * vac;
    const egiP = gprP - vacP;
    const electric = a.electricMonthly * 12 * p.sfShare;
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
 * Building status in a given month:
 * - under_reno: vacated for gut ($0)
 * - stabilized: post-reno at $725 & stabilized vacancy
 * - inplace: waiting its turn - current rents @ initial vacancy
 */
function buildingMonthIncome(ph, month, a) {
  if (month >= ph.renoStart && month <= ph.renoEnd) {
    return {
      status: "under_reno",
      gprMo: 0,
      egiMo: 0,
      vacRate: 1,
      unitsActive: 0,
    };
  }
  if (month >= ph.stabilizeMonth) {
    const gprMo = ph.units * a.rentMonthly;
    return {
      status: "stabilized",
      gprMo,
      egiMo: gprMo * (1 - a.vacancyStabilized),
      vacRate: a.vacancyStabilized,
      unitsActive: ph.units,
    };
  }
  // In-place carry (before this building's reno starts)
  const gprMo = ph.currentGprMonthly;
  return {
    status: "inplace",
    gprMo,
    egiMo: gprMo * (1 - a.vacancyInitial),
    vacRate: a.vacancyInitial,
    unitsActive: ph.units,
  };
}

function buildPhasedSchedule(assumptions, props = PROPERTIES) {
  const a = assumptions;
  const ordered = [...props].sort((x, y) => x.order - y.order);
  const renoMos = Math.max(4, Math.min(6, Math.round(a.renoMonthsEach)));
  const leaseUp = Math.max(0, Math.round(a.leaseUpMonths));

  const phases = [];
  let cursor = 1;

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
      stabGprMonthly: p.units * a.rentMonthly,
    });
    cursor = end + 1;
  }

  const lastStabilize = Math.max(...phases.map((p) => p.stabilizeMonth));
  const totalRehab = phases.reduce((s, p) => s + p.rehabBudget, 0);
  const projectCost = a.purchasePrice + totalRehab + a.closingHolding;

  const pointsFee = projectCost * a.constrPoints;
  const sponsorCashAtClose = a.purchasePrice * a.equityDownPct;
  // Loan at close: 70% of purchase + closing/holding + points (rehab drawn later)
  const closeDraw =
    a.purchasePrice * (1 - a.equityDownPct) + a.closingHolding + pointsFee;
  const commitment = closeDraw + totalRehab; // peak facility if all rehab financed

  const months = [];
  let drawn = 0;
  let cumulativeInterest = 0;
  let dutchInterest = 0;
  let cumulativeEgi = 0;
  let cumulativeInterestPaid = 0;

  // Month-0 in-place portfolio EGI (all buildings operating, none vacated yet)
  const initialGpr = phases.reduce((s, p) => s + p.currentGprMonthly, 0);
  const initialEgi = initialGpr * (1 - a.vacancyInitial);

  for (let m = 0; m <= lastStabilize + 2; m++) {
    let draw = 0;
    const drawNotes = [];

    if (m === 0) {
      draw = closeDraw;
      drawNotes.push(
        `Close: ${(a.equityDownPct * 100).toFixed(0)}% down + loan for remainder + closing + points`
      );
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
    dutchInterest += commitment * (a.constrRate / 12);

    let gprMo = 0;
    let egiMo = 0;
    let unitsInplace = 0;
    let unitsStab = 0;
    let unitsReno = 0;
    const byStatus = { inplace: [], under_reno: [], stabilized: [] };

    for (const ph of phases) {
      const inc = buildingMonthIncome(ph, m, a);
      gprMo += inc.gprMo;
      egiMo += inc.egiMo;
      byStatus[inc.status].push(ph.id);
      if (inc.status === "inplace") unitsInplace += ph.units;
      if (inc.status === "stabilized") unitsStab += ph.units;
      if (inc.status === "under_reno") unitsReno += ph.units;
    }

    const totalUnits = unitsInplace + unitsStab + unitsReno;
    // Blended vacancy on units that could be occupied (excludes fully vacated reno bldg from denom of "economic" vac on GPR)
    const blendedVac = gprMo > 0 ? 1 - egiMo / gprMo : unitsReno === totalUnits ? 1 : a.vacancyInitial;

    cumulativeEgi += egiMo;
    cumulativeInterestPaid += interest;
    const cashAfterInterest = egiMo - interest;

    const activeReno = phases.find((p) => m >= p.renoStart && m <= p.renoEnd);

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
      blendedVac,
      cashAfterInterest,
      cumulativeEgi,
      unitsInplace,
      unitsStab,
      unitsReno,
      vacatedBuilding: activeReno ? activeReno.id : null,
      onlineIds: byStatus.stabilized,
      inplaceIds: byStatus.inplace,
      renoIds: byStatus.under_reno,
      drawNotes,
      label:
        m === 0
          ? "Close"
          : activeReno
            ? `Reno ${activeReno.id}`
            : byStatus.stabilized.length === phases.length
              ? "Stabilized"
              : "Lease-up",
    });
  }

  const totalInterestDraw = cumulativeInterest;
  const totalInterestDutch = dutchInterest;
  const interestSavings = totalInterestDutch - totalInterestDraw;
  const peakDrawn = drawn;
  const sponsorEquityTotal = sponsorCashAtClose; // purchase down; closing/points on loan

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
    sponsorCashAtClose,
    sponsorEquityTotal,
    equityDownPct: a.equityDownPct,
    peakDrawn,
    payoff: peakDrawn,
    totalInterestDraw,
    totalInterestDutch,
    interestSavings,
    initialGpr,
    initialEgi,
    cumulativeEgiAtStab: months.find((r) => r.month === lastStabilize)?.cumulativeEgi || 0,
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
  // Back-compat if UI still sends vacancyRate / electricAnnual
  if (overrides.vacancyRate != null && overrides.vacancyStabilized == null) {
    assumptions.vacancyStabilized = overrides.vacancyRate;
  }
  if (overrides.electricAnnual != null && overrides.electricMonthly == null) {
    assumptions.electricMonthly = overrides.electricAnnual / 12;
  }
  const stabilized = solveStabilized(assumptions);
  const schedule = buildPhasedSchedule(assumptions);
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
