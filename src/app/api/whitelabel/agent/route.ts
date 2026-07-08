/**
 * POST /api/whitelabel/agent — one conversation turn of the /pitch seller
 * agent. Public (the prospect is not logged in). The client executes the
 * returned `action` (e.g. calls /api/whitelabel/provision) and reports the
 * result back via `state` on the next turn.
 */

import { ok, bad, fail } from '@/lib/api-helpers';
import { sellerAgent } from '@/ai/flows/whitelabel/seller-agent';
import { SellerAgentInputSchema } from '@/ai/flows/whitelabel/schemas';
import { LIMITS, checkRateLimit, requestIp, tooMany } from '@/lib/whitelabel/rate-limit';

export const maxDuration = 30;

const MAX_TURNS = 60;

export async function POST(req: Request) {
  const rl = await checkRateLimit(`seller:ip:${requestIp(req)}`, LIMITS.sellerTurnsPerIp(), 600);
  if (!rl.allowed) return tooMany(rl.retryAfterSec);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }

  const parsed = SellerAgentInputSchema.safeParse(raw);
  if (!parsed.success) return bad('Invalid agent input.');
  if (parsed.data.history.length > MAX_TURNS) return bad('Conversation too long.');

  try {
    const output = await sellerAgent(parsed.data);
    return ok(output);
  } catch (error) {
    return fail(error);
  }
}
