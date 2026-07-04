/**
 * Display formatters used by both the dashboard and the API responses.
 *
 * These helpers are pure, dependency-free, and safe to use in any JS runtime.
 */

const STROOPS_PER_XLM = 10_000_000n;
const SCALING_FACTOR_USDC = 1_000_000n; // 6 decimals

/** Format an i128 (or string) amount with the given number of decimals. */
export function formatAmount(
  amount: bigint | string | number,
  decimals: number,
  opts: { trimTrailingZeros?: boolean; minDecimals?: number } = {},
): string {
  const raw = BigInt(amount.toString());
  const negative = raw < 0n;
  const abs = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  let fracStr = frac.toString().padStart(decimals, '0');
  if (opts.trimTrailingZeros ?? true) {
    fracStr = fracStr.replace(/0+$/, '');
  }
  if (opts.minDecimals != null && fracStr.length < opts.minDecimals) {
    fracStr = fracStr.padEnd(opts.minDecimals, '0');
  }
  const result = fracStr.length > 0 ? `${whole}.${fracStr}` : whole.toString();
  return negative ? `-${result}` : result;
}

/** Format a raw XLM value (stroops as bigint). */
export function formatXlm(stroops: bigint | string | number): string {
  return formatAmount(stroops, 7, { minDecimals: 2 });
}

/** Format a raw USDC value (6 decimals). */
export function formatUsdc(units: bigint | string | number): string {
  return formatAmount(units, 6, { minDecimals: 2 });
}

/** Format i128 share amount with 7 decimals (canonical). */
export function formatShares(units: bigint | string | number): string {
  return formatAmount(units, 7, { minDecimals: 2 });
}

export function shortenAddress(address: string, head = 4, tail = 4): string {
  if (!address) return '';
  if (address.length <= head + tail + 1) return address;
  return `${address.slice(0, head)}…${address.slice(-tail)}`;
}

export function shortenTxHash(hash: string, head = 6, tail = 4): string {
  if (!hash) return '';
  if (hash.length <= head + tail + 1) return hash;
  return `${hash.slice(0, head)}…${hash.slice(-tail)}`;
}

/** Returns human-readable relative time like "12m ago", "3h ago". */
export function relativeTime(unixSeconds: number, now: number = Date.now() / 1000): string {
  const diff = now - unixSeconds;
  const abs = Math.abs(diff);
  const sign = diff < 0 ? 'in ' : '';
  const suffix = diff < 0 ? '' : ' ago';
  if (abs < 60) return `${sign}${Math.round(abs)}s${suffix}`;
  if (abs < 3600) return `${sign}${Math.round(abs / 60)}m${suffix}`;
  if (abs < 86400) return `${sign}${Math.round(abs / 3600)}h${suffix}`;
  if (abs < 2592000) return `${sign}${Math.round(abs / 86400)}d${suffix}`;
  if (abs < 31536000) return `${sign}${Math.round(abs / 2592000)}mo${suffix}`;
  return `${sign}${Math.round(abs / 31536000)}y${suffix}`;
}

/** Convert a hex string to `Uint8Array`. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error('hex string must have even length');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error(`invalid hex at position ${i * 2}`);
    bytes[i] = byte;
  }
  return bytes;
}

/** Convert `Uint8Array` to a hex string with optional 0x prefix. */
export function bytesToHex(bytes: Uint8Array, prefix = false): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i] as number;
    s += byte.toString(16).padStart(2, '0');
  }
  return prefix ? `0x${s}` : s;
}

/** Approximate kWh produced in a year for a rated-capacity array. */
export function estimateAnnualKwh(ratedCapacityW: number, capacityFactor = 0.18): number {
  return Math.round((ratedCapacityW / 1000) * 24 * 365 * capacityFactor);
}

/** CO₂ avoided (kg) per kWh (US average ≈ 0.4 kg). */
export function estimateCo2OffsetKg(annualKwh: number, kgPerKwh = 0.4): number {
  return Math.round(annualKwh * kgPerKwh);
}

export const format = {
  amount: formatAmount,
  xlm: formatXlm,
  usdc: formatUsdc,
  shares: formatShares,
  address: shortenAddress,
  hash: shortenTxHash,
  relative: relativeTime,
};
