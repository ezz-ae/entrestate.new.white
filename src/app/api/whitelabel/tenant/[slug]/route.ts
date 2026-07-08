/**
 * GET /api/whitelabel/tenant/[slug] — public read of a demo tenant, used by
 * the /pitch morph and the /demo/[slug] page. Expiry is enforced by the
 * tenant service on read.
 */

import { ok, bad, fail } from '@/lib/api-helpers';
import { getTenantBySlug } from '@/services/tenants';

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug) return bad('Missing tenant slug.');
  try {
    const tenant = await getTenantBySlug(slug);
    if (!tenant) return bad('Tenant not found.', 404);
    // Public endpoint: never expose the claimer's phone number (claimedBy).
    const { claimedBy, ...safe } = tenant;
    return ok({ tenant: safe });
  } catch (error) {
    return fail(error);
  }
}
