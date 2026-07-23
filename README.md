# Reiger Avenue — Lender Pitch

Interactive lender package for **5200 / 5204 / 5206 / 5210 Reiger Ave, Dallas TX**.

Phased full-gut renovation (**5210 → 5206 → 5204 → 5200**), draw-based construction interest (not Dutch), stabilize at **$725/room**, allocate OpEx by building SF, then size permanent take-out.

## Live

**https://web-production-24494.up.railway.app**

Repo: https://github.com/rao30/reiger-lender-pitch

## Run locally

```bash
npm start
# open http://localhost:3000
```

## Model notes

- Each building: 4–6 month gut (default 5), sequential, starting at 5210
- Close draw: purchase + closing/holding + points
- Monthly rehab draws only for the active building
- Interest accrues on **drawn balance only** (Dutch comparison shown live)
- Stabilized rent: $725/room; vacancy, mgmt, R&M on EGI
- Electric, water, other utils, insurance, taxes split by **building SF share**
- Take-out: min(LTV, DSCR) against NOI ÷ cap rate
