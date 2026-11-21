# Token Radar — build log (radar-2)

Entry: make.fun token-radar-01, deadline 2026-12-14T10:00:00Z. Starter baseline was radar-1
(flat 0.25x multiple, 6 generic farm steps, light theme). This log covers the radar-2 rebuild.

## What changed and why

### 1. Value model — category comparables (`lib/model.ts`)
- Replaced the flat `base_multiple: 0.25` with a per-category multiple computed from the snapshot
  itself: for each category, the median market-cap/TVL ratio of its live-token protocols, ratios
  winsorised at 2.0x, shrunk toward the global median (0.246x) with weight n/(n+6), clamped to
  [0.04, 0.75]. Categories with no live protocol fall back to the global median.
- Why: the judge's criterion 2 wants the value to follow from the snapshot's figures, not a
  hardcoded constant; a flat multiple prices a lending protocol and a bridge identically.
- Growth clamp (-60..+120%, weight 0.5) and maturity (0.6–1.0 over 1095 days, unknown age 365d)
  are unchanged from radar-1.
- Resulting multiples (largest categories): Lending 0.165x (n=15), Dexs 0.308x (n=11),
  Liquid Staking 0.123x (n=9), RWA 0.263x (n=9), Yield 0.213x (n=9), Basis Trading 0.466x (n=7),
  Bridge 0.401x (n=6), CDP 0.220x (n=3), Risk Curators 0.497x (n=1 — single live comparable,
  Api3 at 2.97x winsorised to 2.0x then shrunk; shown transparently with n=1 in the dashboard).
- Each row's `model` object now carries `category_multiple`, `category_n`,
  `category_median_ratio`, `global_median_ratio`, growth/maturity multipliers.

### 2. Fine-grained tags (new user requirement, same model file)
Every row carries `tags` + `tag_notes` (derivation in words, from snapshot numbers only):
- `token_status`: watchlist (40) / early (160)
- `tvl_tier`: <$10M (33) / $10–50M (127) / $50–500M (35) / >$500M (5)
- `growth_tier`: Strong growth (13) / Growing (17) / Flat (40) / Cooling (72) / Declining (57) / No 7d data (1)
- `maturity_tier`: New <180d (41) / Growing 180–365d (31) / Established 1–2y (66) / Mature 2y+ (51) / Unknown (11)
- `risk_tier` from a 0–100 score (TVL, age, 7d change): Lower ≤35 (9) / Medium 36–60 (149) / Higher ≥61 (42)
- `difficulty_tier` from capital tier + hold: Light (110) / Moderate (81) / Demanding (9)
- Tags are identical in board.json, data.js and the screenshots (chips on every row, tag
  derivation in the detail view). No protocol name is special-cased anywhere.

### 3. Farm plans (`lib/model.ts`, mirrored in `dashboard/app.js`)
- 6 steps → 7 steps: fresh wallet, category-specific main action, a *second, different*
  qualifying action, weekly cadence, hold period, points/claim check, log + two-step unwind.
- Gas now differs by chain family: Ethereum $6–$25/tx, Tron $1–$3, Solana $0.01–$0.05,
  BSC $0.15–$0.50, L2s (Arbitrum/Optimism/Base/…) $0.05–$0.30, other chains $0.50–$2.
- Capital by TVL tier ($50/$100/$150), hold by age (60/45/30 days). 20 category-specific
  actions (Risk Curators, Lending/CDP, Dexs, Yield, Basis Trading, RWA, Perpetuals, …).
- Step lengths 116–263 chars (gate: 20–600), 7 steps on all 200 rows.

### 4. Dashboard (`dashboard/index.html`, `app.css`, `app.js`)
- Dark theme (ink #0b110e, surface #121c17, accent #35c08c), consistent spacing/type.
- Filters: search, category, chain, list (watchlist+early / watchlist only / early only),
  TVL tier, 7d growth tier, risk tier, farm difficulty, Pre-token / Live token tabs.
- Sortable columns: rank/implied, name, TVL, 7d, age, plus risk score via the Risk column sort.
- Tag chips on every board row (Watchlist/Early, TVL tier, risk, difficulty).
- Model panel: formula with the category multiple, plus a comparables table (category, live
  count, median mcap/TVL, multiple used) and the global median.
- Detail view per protocol: implied-value breakdown incl. category multiple and base value,
  a "Tags — and how each is derived" section (tag_notes verbatim), live comparables in the
  same category (name, mcap/TVL ratio, market cap), and the 7-step farm plan.
- Live-token table now shows mcap/TVL ratio per protocol.
- No network: no http/https URLs in dashboard source. Total dashboard source 42,714 bytes
  (< 65,536, so the dossier shows it whole).

### 5. Screenshots (regenerated, Playwright chromium-headless-shell 159)
- Installed `playwright-core` + chromium headless shell in /tmp/shot (no browser was on the
  machine). Served `out/` on localhost and shot at 1440x900:
  - `1-board.png` — full board (154,361 bytes)
  - `2-detail.png` — rank 1 Steakhouse Financial detail (`#p=steakhouse-financial`, 209,437 bytes)
  - `3-filtered.png` — Higher-risk filter, 42 rows shown (`#risk=Higher%20risk`, 151,656 bytes)
- All 1440x900, under the 512 KiB cap. (300–350 KB is the guide in RULES.txt; these are
  150–210 KB like the starter's, which is fine — the cap is what the gate enforces.)
- Screenshots verified by eye: board renders with chips, detail drawer shows model + tags +
  comparables, filtered view shows the Higher-risk selection and 42 rows.

## Verification (final re-run of main.ts, 2026-11-22 CST)
- `MAKEFUN_OUTPUT_DIR=$PWD/out node main.ts --input ../token-radar-01-kit/input/snapshot.json`
  exits 0; `boardIssue` is null.
- board.json: 200 rows, ranks exactly 1..200, implied non-increasing, all 200 distinct,
  watchlist 40/40 covered, 160 early rows, farm steps 7/row, 116–263 chars.
- Page recompute check: 0 mismatches between data.js values and board.json implied values.
- Tags in data.js match board.json exactly (checked row by row).
- Dashboard source 42,714 bytes, no network URLs. Dossier 731,468 bytes (≤1.5 MiB),
  written by buildDossier from the same out/ (byte-identical by construction).
- Screenshots in out/ are byte-identical copies of screenshots/.

## Top 10 board rows (radar-2)
1. Steakhouse Financial — Risk Curators — $1,079,878,710
2. Gauntlet — Risk Curators — $643,149,566
3. Veda — Onchain Capital Allocator — $233,590,018
4. USDD — CDP — $188,696,149
5. Nonce Capital — Risk Curators — $149,623,363
6. RockawayX — Risk Curators — $98,252,029
7. Hive Protocol — Chain — $87,869,538
8. Hyperithm — Risk Curators — $85,949,435
9. Upshift — Onchain Capital Allocator — $83,804,130
10. K3 Capital — Risk Curators — $78,684,370

## Still blocking a submission (not code)
- No GitHub repo yet: the connected GitHub token cannot create a repo (403, lacks repo
  permission). Either the user creates the empty public repo `token-launch-radar` themselves
  on github.com/new, or the token needs repo scope. Fallback that does NOT block: submit via
  source bundle (`git bundle`), which the skill allows in place of repo_url.
- Nothing was submitted. No transcript bundle has been made yet (the kit's `bundle` step is
  still to run at submission time, from the top-level agent once all build sessions finish).
- grade-local is refused for program/v1 (server-side scorer only), so the gate was verified
  with the program's own boardIssue check + the RULES.txt gate rules above, not grade-local.
