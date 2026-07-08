/**
 * POST /api/whitelabel/provision
 *
 * The "system in minutes" engine behind the /pitch AI call. Public — the
 * prospect is mid-sales-call, not logged in. Given a company name (and
 * ideally a website), it scrapes their brand, extracts a TenantBrand via
 * the whitelabel Genkit flow, creates the tenant, seeds listings, and
 * returns the live demo slug. Synchronous by design: everything must be
 * done before the landing page morphs.
 */

import { ok, bad, fail } from '@/lib/api-helpers';
import { scrapeSite } from '@/lib/whitelabel/scrape';
import { seedListings } from '@/lib/whitelabel/seed-listings';
import { extractBrand } from '@/ai/flows/whitelabel/extract-brand';
import { createTenant, markTenantLive } from '@/services/tenants';
import { adminDb } from '@/lib/firebaseAdmin';
import { LIMITS, checkRateLimit, requestIp, tooMany } from '@/lib/whitelabel/rate-limit';
import type { TenantBrand, TenantListing, TenantLocale } from '@/types';

export const maxDuration = 60;

export async function POST(req: Request) {
  const rl = await checkRateLimit(`provision:ip:${requestIp(req)}`, LIMITS.provisionPerIpPerHour(), 3600);
  if (!rl.allowed) return tooMany(rl.retryAfterSec);

  let body: { companyName?: string; websiteUrl?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }

  const companyName = (body.companyName || '').trim().slice(0, 120);
  if (companyName.length < 2) return bad('companyName is required.');
  const locale: TenantLocale = body.locale === 'ar' ? 'ar' : 'en';

  try {
    const scraped = body.websiteUrl ? await scrapeSite(body.websiteUrl) : null;

    const extracted = await extractBrand({
      companyName,
      sourceUrl: scraped?.url,
      siteTitle: scraped?.title,
      siteDescription: scraped?.description,
      siteText: scraped?.text,
      colorCandidates: scraped?.colorCandidates,
      locale,
    });

    const brand: TenantBrand = {
      companyName: extracted.companyName || companyName,
      tagline: extracted.tagline,
      logoUrl: scraped?.imageCandidates[0] ?? null,
      colors: { primary: extracted.primaryColor, accent: extracted.accentColor },
      contact: { phone: extracted.contactPhone, email: extracted.contactEmail },
      locale,
      sourceUrl: scraped?.url,
    };

    const prospectListings: TenantListing[] = (extracted.listings || []).map((l, i) => ({
      id: `own-${i}`,
      title: l.title,
      area: l.area,
      price: l.price,
      bedrooms: l.bedrooms,
      fromProspect: true,
    }));

    const tenant = await createTenant(brand);
    const listings = seedListings(prospectListings);
    await markTenantLive(tenant.id, brand, listings);

    // Every provisioned demo is a hot lead for Entrestate's own pipeline,
    // claimed or not. Best-effort — never blocks the reveal.
    try {
      await adminDb?.collection('pitchSessions').add({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        companyName: brand.companyName,
        websiteUrl: brand.sourceUrl ?? null,
        locale,
        listingsFound: prospectListings.length,
        status: 'demo_live',
        createdAt: Date.now(),
      });
    } catch {}

    return ok({ tenant: { ...tenant, status: 'live', listings } });
  } catch (error) {
    return fail(error);
  }
}
