// The token radar's model: one snapshot of the protocol universe in, one ranked board out.
//
// The board covers every slug in the snapshot's watchlist (the floor, never a ceiling) and may add
// pre-token protocols below the watchlist floor: the early rows the radar exists to find. A protocol is
// pre-token when its index entry records no token (no market cap, no CoinGecko id, no symbol); the
// snapshot's live-token protocols are kept apart and shown as the market's own values, never mixed into
// the ranked board.
//
// Implied value follows only from the snapshot's own figures. The base multiple is NOT a flat constant:
// it is the category's comparable multiple, computed from the snapshot itself — the median market-cap /
// TVL ratio of the live-token protocols in the same category, shrunk toward the global median when the
// category has few live comparables, so a category with one wild outlier cannot set the price. Ratios
// are winsorised at 2.0 before the median is taken, and the final multiple is clamped to [0.04, 0.75].
//
//   catMultiple = clamp( w * median_winsorised(category ratios) + (1 - w) * globalMedian, 0.04, 0.75 )
//                 w = n / (n + 6),  n = live comparables in the category (n = 0 -> global median)
//   growth     = clamp(change_7d, -60, 120) per cent
//   growthMult = 1 + (growth / 100) x GROWTH_WEIGHT
//   maturity   = 0.6 + min(age_days, 1095) / 1095 x 0.4   (age_days unknown: 365)
//   implied    = max(1, round(tvl_usd x catMultiple x growthMult x maturity))
//
// Every row also carries fine-grained tags, all derived from the same snapshot figures — never from a
// hand-written list of names, never from a protocol's name:
//   token_status  watchlist (on the snapshot's watchlist) or early (pre-token, below the floor)
//   tvl_tier      <$10M / $10-50M / $50-500M / >$500M, from tvl_usd
//   growth_tier   Strong growth / Growing / Flat / Cooling / Declining / No 7d data, from change_7d
//   maturity_tier New / Growing / Established / Mature / Unknown age, from age_days
//   risk_tier     Lower / Medium / Higher risk, from a 0-100 risk score built from TVL, age and growth
//   difficulty    Light / Moderate / Demanding farm, from the capital tier and the hold period
// tag_notes spells out, for each tag, the exact snapshot numbers that produced it, so the dashboard's
// detail view can show the derivation and board.json, data.js and the screenshots all agree.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The model's constants, as the dashboard states them and the sandbox may change them. */
export interface ModelConstants {
  growth_weight: number;
  growth_floor: number;
  growth_cap: number;
  maturity_floor: number;
  maturity_range: number;
  maturity_days: number;
  unknown_age_days: number;
  shrink_k: number;
  ratio_cap: number;
  multiple_floor: number;
  multiple_cap: number;
}

export const MODEL: ModelConstants = {
  growth_weight: 0.5,
  growth_floor: -60,
  growth_cap: 120,
  maturity_floor: 0.6,
  maturity_range: 0.4,
  maturity_days: 1095,
  unknown_age_days: 365,
  shrink_k: 6,
  ratio_cap: 2.0,
  multiple_floor: 0.04,
  multiple_cap: 0.75,
};

/** The model's version label: the dashboard names it and the rules quote it. */
export const MODEL_VERSION = 'radar-2';

/** How many pre-token protocols below the watchlist floor the early radar carries, by TVL. */
export const EARLY_ROWS = 160;

/** How many live-token protocols the Live token view carries, by market cap. */
export const LIVE_ROWS = 24;

/** One category's comparable multiple, computed from the snapshot's live-token protocols. */
export interface CategoryMultiple {
  category: string;
  live_count: number;
  median_ratio: number | null;
  multiple: number;
}

/** Fine-grained tags for one row, each derived from the snapshot figures (see header). */
export interface RowTags {
  token_status: 'watchlist' | 'early';
  tvl_tier: string;
  growth_tier: string;
  maturity_tier: string;
  risk_tier: string;
  difficulty_tier: string;
  risk_score: number;
}

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One row of board.json: the ranked board's row. */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: {
    category_multiple: number;
    category_n: number;
    category_median_ratio: number | null;
    global_median_ratio: number;
    growth_pct: number;
    growth_multiplier: number;
    maturity_multiplier: number;
    age_days: number | null;
  };
  tags: RowTags;
  tag_notes: Record<string, string>;
  farm_steps: string[];
}

/** The dashboard's compact view of one row, with farm plans generated in the page. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  age_days: number | null;
  implied_value_usd: number;
  category_multiple: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  tags: RowTags;
  tag_notes: Record<string, string>;
}

/** A live-token protocol: it already trades, so the board shows the market's own value, not a model's. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
  ratio: number | null;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model: ModelConstants;
  model_version: string;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  global_median_ratio: number;
  category_multiples: CategoryMultiple[];
  comparables: Record<string, LiveRow[]>;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

const round4 = (n: number): number => Math.round(n * 1e4) / 1e4;

/** Median of a non-empty list of numbers. */
function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/**
 * Category comparables from the snapshot's live-token protocols (mcap and TVL both present, not a CEX).
 * Each protocol's ratio is winsorised at the model's ratio cap before the median, so one protocol with
 * a tiny TVL and a huge market cap cannot set its category's price. Categories with no live protocol
 * fall back to the global median; the rest are shrunk toward it with weight n / (n + shrink_k).
 */
export function categoryMultiples(snapshot: Snapshot, model: ModelConstants = MODEL): { global: number; byCategory: Map<string, CategoryMultiple> } {
  const live = snapshot.protocols.filter((p) => !isPreToken(p) && p.category !== 'CEX' && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0);
  const ratios = live.map((p) => Math.min(p.mcap_usd! / p.tvl_usd, model.ratio_cap));
  const global = ratios.length > 0 ? median(ratios) : 0.25;
  const byCat = new Map<string, number[]>();
  for (const p of live) {
    const key = p.category ?? 'Other';
    const list = byCat.get(key) ?? [];
    list.push(Math.min(p.mcap_usd! / p.tvl_usd, model.ratio_cap));
    byCat.set(key, list);
  }
  const byCategory = new Map<string, CategoryMultiple>();
  for (const [cat, rs] of byCat) {
    const med = median(rs);
    const w = rs.length / (rs.length + model.shrink_k);
    const multiple = Math.min(model.multiple_cap, Math.max(model.multiple_floor, w * med + (1 - w) * global));
    byCategory.set(cat, { category: cat, live_count: rs.length, median_ratio: round4(med), multiple: round4(multiple) });
  }
  return { global: round4(global), byCategory };
}

/** The category multiple a protocol gets: its category's, or the global median when it has none. */
function multipleFor(p: SnapshotProtocol, comps: { global: number; byCategory: Map<string, CategoryMultiple> }): CategoryMultiple {
  const hit = comps.byCategory.get(p.category ?? 'Other');
  if (hit) return hit;
  return { category: p.category ?? 'Other', live_count: 0, median_ratio: null, multiple: comps.global };
}

/** The three multipliers and the implied value one protocol gets under `model`. */
export function impliedValue(
  protocol: SnapshotProtocol,
  asOf: string,
  model: ModelConstants,
  comps: { global: number; byCategory: Map<string, CategoryMultiple> },
): { implied: number; multiple: CategoryMultiple; growthPct: number; growthMult: number; maturityMult: number; age: number | null } {
  const age = ageDays(asOf, protocol.listed_at);
  const rawGrowth = finite(protocol.change_7d, 0);
  const growthPct = Math.min(model.growth_cap, Math.max(model.growth_floor, rawGrowth));
  const growthMult = 1 + (growthPct / 100) * model.growth_weight;
  const ageForModel = age ?? model.unknown_age_days;
  const maturityMult = model.maturity_floor + (Math.min(Math.max(ageForModel, 0), model.maturity_days) / model.maturity_days) * model.maturity_range;
  const multiple = multipleFor(protocol, comps);
  const implied = Math.max(1, Math.round(protocol.tvl_usd * multiple.multiple * growthMult * maturityMult));
  return { implied, multiple, growthPct, growthMult, maturityMult, age };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol is one the board may rank: pre-token, not an exchange, not a versioned pool. */
export function isRankable(p: SnapshotProtocol): boolean {
  return isPreToken(p) && p.category !== 'CEX' && !VERSIONED.test(p.name);
}

/** The snapshot's protocol by slug. */
function bySlug(protocols: SnapshotProtocol[]): Map<string, SnapshotProtocol> {
  return new Map(protocols.map((p) => [p.slug, p]));
}

/** Format a dollar amount compactly for a tag note. */
function fmtMoney(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`;
  return `$${Math.round(n)}`;
}

/** TVL size tier from the protocol's own TVL. */
export function tvlTier(tvl: number): string {
  if (tvl >= 500_000_000) return '>$500M';
  if (tvl >= 50_000_000) return '$50–500M';
  if (tvl >= 10_000_000) return '$10–50M';
  return '<$10M';
}

/** Seven-day growth tier from the protocol's own 7d change. */
export function growthTier(change7d: number | null): string {
  if (change7d === null) return 'No 7d data';
  if (change7d >= 10) return 'Strong growth';
  if (change7d >= 2) return 'Growing';
  if (change7d >= -2) return 'Flat';
  if (change7d >= -10) return 'Cooling';
  return 'Declining';
}

/** Maturity tier from the protocol's age with no token. */
export function maturityTier(age: number | null): string {
  if (age === null) return 'Unknown age';
  if (age < 180) return 'New';
  if (age < 365) return 'Growing';
  if (age < 730) return 'Established';
  return 'Mature';
}

/**
 * Risk score 0-100 from the snapshot figures: big TVL and long age pull it down, a young protocol or a
 * falling TVL push it up. Start at 50; TVL >=$1B -20, >=$500M -15, >=$100M -10, >=$50M -5, <$10M +15;
 * age >=730d -10, >=365d -5, <180d +10, unknown +5; 7d >=+10% -5, <-10% +10, <-2% +5, unknown 0.
 */
export function riskScore(p: SnapshotProtocol, age: number | null): number {
  let s = 50;
  if (p.tvl_usd >= 1_000_000_000) s -= 20;
  else if (p.tvl_usd >= 500_000_000) s -= 15;
  else if (p.tvl_usd >= 100_000_000) s -= 10;
  else if (p.tvl_usd >= 50_000_000) s -= 5;
  else if (p.tvl_usd < 10_000_000) s += 15;
  if (age === null) s += 5;
  else if (age >= 730) s -= 10;
  else if (age >= 365) s -= 5;
  else if (age < 180) s += 10;
  if (p.change_7d === null) s += 0;
  else if (p.change_7d >= 10) s -= 5;
  else if (p.change_7d < -10) s += 10;
  else if (p.change_7d < -2) s += 5;
  return Math.max(0, Math.min(100, s));
}

export function riskTier(score: number): string {
  if (score <= 35) return 'Lower risk';
  if (score <= 60) return 'Medium risk';
  return 'Higher risk';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

/**
 * Farming difficulty from the capital tier and the hold period the model itself sets: a big capital
 * requirement is demanding on its own, as is a mid-size position held for the longest window.
 */
export function difficultyTier(p: SnapshotProtocol, age: number | null): string {
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  if (capital >= 150 || (capital >= 100 && hold >= 60)) return 'Demanding farm';
  if (capital >= 100 || hold >= 45) return 'Moderate farm';
  return 'Light farm';
}

/** All fine-grained tags for one protocol, plus a note per tag spelling out the numbers behind it. */
export function computeTags(p: SnapshotProtocol, age: number | null, onWatchlist: boolean): { tags: RowTags; notes: Record<string, string> } {
  const score = riskScore(p, age);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const tags: RowTags = {
    token_status: onWatchlist ? 'watchlist' : 'early',
    tvl_tier: tvlTier(p.tvl_usd),
    growth_tier: growthTier(p.change_7d),
    maturity_tier: maturityTier(age),
    risk_tier: riskTier(score),
    difficulty_tier: difficultyTier(p, age),
    risk_score: score,
  };
  const notes: Record<string, string> = {
    token_status: onWatchlist
      ? 'On the snapshot watchlist: TVL at or above the $50M floor with no token on record.'
      : `Pre-token and below the $50M watchlist floor (TVL ${fmtMoney(p.tvl_usd)}), found by the early radar.`,
    tvl_tier: `TVL ${fmtMoney(p.tvl_usd)} falls in the ${tags.tvl_tier} bracket.`,
    growth_tier:
      p.change_7d === null
        ? 'The snapshot reports no 7-day TVL change for this protocol.'
        : `7-day TVL change ${p.change_7d >= 0 ? '+' : ''}${p.change_7d.toFixed(2)}% falls in the ${tags.growth_tier} bracket.`,
    maturity_tier:
      age === null
        ? 'The snapshot gives no listing date, so age is unknown.'
        : `Listed ${age} days before the snapshot, in the ${tags.maturity_tier} bracket.`,
    risk_tier: `Risk score ${score}/100 from TVL ${fmtMoney(p.tvl_usd)}, age ${age === null ? 'unknown' : `${age}d`} and 7d ${p.change_7d === null ? 'n/a' : `${p.change_7d.toFixed(1)}%`}: ${score} or less is Lower risk, 61 or more is Higher risk.`,
    difficulty_tier: `Farming needs $${capital} of capital and a ${hold}-day hold, which the model rates a ${tags.difficulty_tier.toLowerCase()}.`,
  };
  return { tags, notes };
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot, model: ModelConstants = MODEL): BoardRow[] {
  const comps = categoryMultiples(snapshot, model);
  const index = bySlug(snapshot.protocols);
  const watch = new Set(snapshot.watchlist);
  const chosen = new Map<string, SnapshotProtocol>();
  for (const slug of snapshot.watchlist) {
    const p = index.get(slug);
    if (p !== undefined) chosen.set(slug, p);
  }
  const early = snapshot.protocols
    .filter((p) => !chosen.has(p.slug) && isRankable(p) && p.tvl_usd < snapshot.floor_usd)
    .sort((a, b) => b.tvl_usd - a.tvl_usd || (a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0))
    .slice(0, EARLY_ROWS);
  for (const p of early) chosen.set(p.slug, p);

  const scored = [...chosen.values()].map((p) => {
    const v = impliedValue(p, snapshot.as_of, model, comps);
    const { tags, notes } = computeTags(p, v.age, watch.has(p.slug));
    return { p, ...v, tags, notes };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  return scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      category_multiple: s.multiple.multiple,
      category_n: s.multiple.live_count,
      category_median_ratio: s.multiple.median_ratio,
      global_median_ratio: comps.global,
      growth_pct: s.growthPct,
      growth_multiplier: round4(s.growthMult),
      maturity_multiplier: round4(s.maturityMult),
      age_days: s.age,
    },
    tags: s.tags,
    tag_notes: s.notes,
    farm_steps: farmSteps(s.p, s.age).map(stepText),
  }));
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/**
 * Gas cost of one transaction on a chain family, in dollars. Ethereum mainnet is expensive, its L2s
 * and most other chains are cheap, Solana and BSC are cheapest. Derived from the chain name only.
 */
export function gasFor(chain: string): { per_tx: string; setup: string; weekly: string } {
  const c = chain.toLowerCase();
  if (c === 'ethereum') return { per_tx: '$6–$25', setup: '$12–$40', weekly: '$6–$25' };
  if (c === 'tron') return { per_tx: '$1–$3', setup: '$3–$8', weekly: '$1–$3' };
  if (c === 'solana') return { per_tx: '$0.01–$0.05', setup: 'under $0.20', weekly: '$0.01–$0.05' };
  if (c === 'binance' || c === 'bnb chain' || c === 'bsc') return { per_tx: '$0.15–$0.50', setup: 'under $1', weekly: '$0.15–$0.50' };
  if (['arbitrum', 'optimism', 'base', 'unichain', 'polygon', 'blast', 'zksync', 'scroll', 'linea', 'mantle', 'mode', 'ink', 'katana', 'tempo', 'stable', 'arc', 'corn', 'bob', 'morph'].includes(c))
    return { per_tx: '$0.05–$0.30', setup: 'under $1', weekly: '$0.05–$0.30' };
  return { per_tx: '$0.50–$2', setup: '$1–$4', weekly: '$0.50–$2' };
}

/** The category's main action, in the words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('risk curator') || c.includes('curator') || c.includes('allocator') || c.includes('onchain capital'))
    return `Deposit $${capital} into a ${name} vault on ${chain} and keep the shares for the whole hold.`;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral'))
    return `Supply $${capital} of USDC to ${name} on ${chain} as collateral and keep the position open.`;
  if (c.includes('dex') || c.includes('liquidity manager'))
    return `Provide $${capital} of liquidity to ${name}'s main pool on ${chain} in a tight range and keep it open.`;
  if (c.includes('yield aggregator') || c.includes('yield'))
    return `Deposit $${capital} of USDC into ${name}'s highest-TVL strategy on ${chain} and let it compound.`;
  if (c.includes('leveraged farm')) return `Open a $${capital} leveraged position on ${name} on ${chain} at 2x and monitor the health factor daily.`;
  if (c.includes('bridge') || c.includes('cross chain')) return `Bridge $${capital} of USDC to ${chain} through ${name} and use the bridged funds in its app.`;
  if (c.includes('liquid restak') || c.includes('restak') || c.includes('staking'))
    return `Stake $${capital} of the chain's staking asset through ${name} on ${chain} and keep the receipt token.`;
  if (c.includes('basis trading')) return `Deposit $${capital} of USDC into ${name}'s basis vault on ${chain} and hold the position through one funding cycle.`;
  if (c.includes('perpetual') || c.includes('derivative') || c.includes('options'))
    return `Deposit $${capital} of USDC as margin on ${name} on ${chain} and open one small hedged position.`;
  if (c.includes('prediction')) return `Fund $${capital} and place one market position on ${name} on ${chain}.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain} and hold it.`;
  if (c.includes('rwa')) return `Mint $${capital} of ${name}'s yield-bearing asset on ${chain} and hold it for the full period.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  if (c.includes('governance')) return `Lock $${capital} of the governance asset through ${name} on ${chain} and vote in the next proposal.`;
  if (c.includes('payment')) return `Route $${capital} of payments through ${name} on ${chain} across at least two separate transfers.`;
  if (c.includes('launchpad')) return `Stake $${capital} through ${name} on ${chain} to qualify for its next launch allocation.`;
  if (c.includes('index')) return `Buy $${capital} of the ${name} index on ${chain} and hold the basket.`;
  if (c.includes('token locker')) return `Lock $${capital} of tokens in ${name} on ${chain} for the minimum lock period.`;
  if (c.includes('privacy')) return `Deposit $${capital} through ${name}'s private pool on ${chain} and keep the note.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and keep the position open.`;
}

/** The category's second qualifying action: a different interaction from the first, so the farm is not one click. */
function secondActionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral'))
    return `Borrow $${Math.round(capital / 4)} against the supplied collateral on ${name} and repay it within the week.`;
  if (c.includes('dex') || c.includes('liquidity manager'))
    return `Swap $${Math.round(capital / 2)} through ${name}'s router on ${chain} in a second pool.`;
  if (c.includes('risk curator') || c.includes('curator') || c.includes('allocator'))
    return `Move $${Math.round(capital / 2)} between two ${name} vaults on ${chain} so both vaults see activity.`;
  if (c.includes('yield')) return `Claim and restake the yield from ${name} on ${chain} once during the hold.`;
  if (c.includes('bridge')) return `Bridge a second, smaller amount of $${Math.round(capital / 4)} back through ${name} to show two-way use.`;
  if (c.includes('staking') || c.includes('restak')) return `Delegate a second stake of $${Math.round(capital / 4)} through ${name} to a different validator set.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Close the hedge on ${name} and open a fresh one at a different size.`;
  if (c.includes('governance')) return `Vote on a second proposal in ${name} and leave a short forum comment.`;
  return `Do a second, different action on ${name} on ${chain} — a swap, a vote or a small deposit of $${Math.round(capital / 4)}.`;
}

/**
 * A protocol's farm plan: seven steps, each an action with a cost and a time. The plan is derived from
 * the protocol's own record (category, chains, TVL, age), never from a hand-written list of names. Gas
 * differs by chain family, capital by TVL tier, hold by age.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const gas = gasFor(chain);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const extraChain = p.chains.length > 1 ? ` It also runs on ${p.chains.slice(1, 3).join(' and ')}, but farm on ${chain} first.` : '';
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'no cost to create the wallet',
      time: '5 minutes',
    },
    {
      text: `${actionFor(p, capital, chain)}${extraChain}`,
      cost: `$${capital} of capital and about ${gas.setup} of gas on ${chain}`,
      time: '15 minutes to set up',
    },
    {
      text: secondActionFor(p, capital, chain),
      cost: `about ${gas.per_tx} of gas on ${chain}`,
      time: '10 minutes',
    },
    {
      text: `Make one qualifying action each week on ${chain}, such as a deposit, a borrow, a swap or a vote, so the wallet stays active.`,
      cost: `about ${gas.weekly} of gas a week on ${chain}`,
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Before you withdraw, open the protocol's own points or rewards page and claim only from the link it publishes.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction hash in a farm log, then unwind in two steps: withdraw half, wait a day, withdraw the rest.`,
      cost: `about ${gas.per_tx} of gas per withdrawal on ${chain}`,
      time: '10 minutes plus a day to unwind',
    },
  ];
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, LIVE_ROWS)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      ratio: p.mcap_usd !== null && p.tvl_usd > 0 ? round4(p.mcap_usd / p.tvl_usd) : null,
    }));
}

/** Live comparables in one category: the live-token protocols the multiple was built from. */
export function comparablesFor(snapshot: Snapshot, category: string | null): LiveRow[] {
  const key = category ?? 'Other';
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX' && (p.category ?? 'Other') === key && p.mcap_usd !== null && p.mcap_usd > 0 && p.tvl_usd > 0)
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0))
    .slice(0, 5)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
      ratio: round4(p.mcap_usd! / p.tvl_usd),
    }));
}

/** A board row's compact form for data.js, with the farm plan generated in the page. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    mcap_usd: row.mcap_usd,
    listed_at: row.listed_at,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    category_multiple: row.model.category_multiple,
    growth_multiplier: row.model.growth_multiplier,
    maturity_multiplier: row.model.maturity_multiplier,
    tags: row.tags,
    tag_notes: row.tag_notes,
  };
}

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot, model: ModelConstants = MODEL): { board: BoardRow[]; radar: RadarData } {
  const board = buildBoard(snapshot, model);
  const comps = categoryMultiples(snapshot, model);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model,
    model_version: MODEL_VERSION,
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    global_median_ratio: comps.global,
    category_multiples: [...comps.byCategory.values()].sort((a, b) => b.live_count - a.live_count || a.category.localeCompare(b.category)),
    comparables: Object.fromEntries(
      [...new Set(board.map((r) => r.category ?? 'Other'))].map((c) => [c, comparablesFor(snapshot, c === 'Other' ? null : c)]),
    ),
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/** Why a board is not one the gate will take, or null: coverage, ranks, order, one shared implied value, and farm steps. */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  const slugs = new Set(board.map((r) => r.slug));
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    const steps = r.farm_steps;
    if (steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) if (s.length < 20 || s.length > 600) return `${r.slug} has a farm step of ${s.length} characters`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
