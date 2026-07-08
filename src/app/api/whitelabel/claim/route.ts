/**
 * POST /api/whitelabel/claim — records claim intent for a provisioned demo
 * tenant (the /pitch close) or a voice page. Public: the prospect isn't a
 * user yet — this IS Entrestate's own lead capture. Stored in `claims` for
 * the sales pipeline; billing later turns a claim into an account.
 */

import { z } from 'zod';
import { ok, bad, fail } from '@/lib/api-helpers';
import { adminDb } from '@/lib/firebaseAdmin';
import { getTenantBySlug } from '@/services/tenants';
import { LIMITS, checkRateLimit, requestIp, tooMany } from '@/lib/whitelabel/rate-limit';

const claimSchema = z.object({
  tenantSlug: z.string().min(1).max(64),
  name: z.string().min(2).max(120),
  phone: z.string().min(5).max(40),
  email: z.string().email().max(120).optional().or(z.literal('')),
  note: z.string().max(500).optional(),
});

export async function POST(req: Request) {
  const rl = await checkRateLimit(`claim:ip:${requestIp(req)}`, LIMITS.provisionPerIpPerHour(), 3600);
  if (!rl.allowed) return tooMany(rl.retryAfterSec);
  if (!adminDb) return fail('Service unavailable.', 503);

  const body = await req.json().catch(() => null);
  const parsed = claimSchema.safeParse(body);
  if (!parsed.success) return bad(parsed.error.errors[0]?.message || 'Invalid claim.');
  const { tenantSlug, name, phone, email, note } = parsed.data;

  try {
    const tenant = await getTenantBySlug(tenantSlug);
    if (!tenant) return bad('Demo not found.', 404);

    await adminDb.collection('claims').add({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      companyName: tenant.brand.companyName,
      locale: tenant.brand.locale,
      sourceUrl: tenant.brand.sourceUrl ?? null,
      name,
      phone,
      email: email || null,
      note: note || null,
      status: 'new',
      createdAt: Date.now(),
    });
    // A claimed demo stops the expiry clock conceptually; billing finalizes it.
    if (tenant.status === 'live') {
      await adminDb.collection('tenants').doc(tenant.id).update({ status: 'claimed', claimedBy: phone });
    }
    return ok({ claimed: true });
  } catch (e) {
    return fail(e);
  }
}
