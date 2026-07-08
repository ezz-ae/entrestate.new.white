/**
 * Fixed-window rate limiter on Firestore, for the public white-label
 * endpoints (provision, agent turns, styles, beacons). Serverless-safe:
 * state lives in the `rateLimits` collection, one doc per key, updated in a
 * transaction. Fails OPEN — if the limiter itself errors, the request is
 * allowed; the AI endpoints are budget-sensitive but availability wins.
 *
 * Also the enforcement point for usage quotas: tier limits become a
 * `checkRateLimit` call with the owner's uid as the key.
 */

import { adminDb } from '@/lib/firebaseAdmin';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
}

/**
 * Count one hit against `key`; allow at most `limit` hits per `windowSec`.
 * Key convention: "<route>:<scope>", e.g. "provision:ip:1.2.3.4".
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  if (!adminDb) return { allowed: true, remaining: limit, retryAfterSec: 0 };
  const safeKey = key.toLowerCase().replace(/[^a-z0-9:._-]/g, '_').slice(0, 480);
  const ref = adminDb.collection('rateLimits').doc(safeKey);
  const now = Date.now();
  try {
    return await adminDb.runTransaction(async (tx) => {
      const doc = await tx.get(ref);
      const data = doc.data() as { count: number; resetAt: number } | undefined;
      if (!data || data.resetAt <= now) {
        tx.set(ref, { count: 1, resetAt: now + windowSec * 1000 });
        return { allowed: true, remaining: limit - 1, retryAfterSec: 0 };
      }
      if (data.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSec: Math.max(1, Math.ceil((data.resetAt - now) / 1000)),
        };
      }
      tx.update(ref, { count: data.count + 1 });
      return { allowed: true, remaining: limit - data.count - 1, retryAfterSec: 0 };
    });
  } catch {
    return { allowed: true, remaining: limit, retryAfterSec: 0 };
  }
}

/** Client IP for rate-limit keys (first x-forwarded-for hop, or "unknown"). */
export function requestIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || 'unknown').slice(0, 64);
}

/** 429 response in the API envelope shape used across the app. */
export function tooMany(retryAfterSec: number, message = 'Too many requests. Please try again shortly.') {
  return Response.json(
    { ok: false, error: message },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
  );
}

const envInt = (name: string, fallback: number): number => {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
};

/** Central knobs — env-overridable so pricing tiers can tune them later. */
export const LIMITS = {
  /** Tenant provisioning per IP per hour (each run costs scraping + Gemini). */
  provisionPerIpPerHour: () => envInt('WL_PROVISION_IP_HOURLY', 6),
  /** Seller-agent turns per IP per 10 minutes. */
  sellerTurnsPerIp: () => envInt('WL_SELLER_TURNS_IP_10MIN', 40),
  /** Buyer-agent turns per IP per 10 minutes. */
  buyerTurnsPerIp: () => envInt('WL_BUYER_TURNS_IP_10MIN', 60),
  /** Buyer-agent turns per voice page per day (abuse ceiling per ad page). */
  buyerTurnsPerPagePerDay: () => envInt('WL_BUYER_TURNS_PAGE_DAILY', 1000),
  /** Style generations per IP per hour. */
  stylesPerIpPerHour: () => envInt('WL_STYLES_IP_HOURLY', 10),
  /** Analytics beacons per IP per 10 minutes. */
  trackPerIp: () => envInt('WL_TRACK_IP_10MIN', 120),
  /** Owner's monthly voice turns; 0 = unlimited until tiers are priced. */
  ownerTurnsPerMonth: () => envInt('WL_OWNER_TURNS_MONTHLY', 0),
};
