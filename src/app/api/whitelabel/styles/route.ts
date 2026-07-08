/**
 * POST /api/whitelabel/styles — public: scrape a site and return four brand
 * style directions for the /styles free tool. { websiteUrl, locale? }
 */

import { ok, bad, fail } from '@/lib/api-helpers';
import { scrapeSite } from '@/lib/whitelabel/scrape';
import { multiStyles } from '@/ai/flows/whitelabel/multi-styles';
import { LIMITS, checkRateLimit, requestIp, tooMany } from '@/lib/whitelabel/rate-limit';

export const maxDuration = 60;

export async function POST(req: Request) {
  const rl = await checkRateLimit(`styles:ip:${requestIp(req)}`, LIMITS.stylesPerIpPerHour(), 3600);
  if (!rl.allowed) return tooMany(rl.retryAfterSec);

  let body: { websiteUrl?: string; locale?: string };
  try {
    body = await req.json();
  } catch {
    return bad('Invalid JSON body.');
  }

  const websiteUrl = (body.websiteUrl || '').trim().slice(0, 300);
  if (websiteUrl.length < 4) return bad('websiteUrl is required.');
  const locale = body.locale === 'ar' ? ('ar' as const) : ('en' as const);

  try {
    const scraped = await scrapeSite(websiteUrl);
    if (!scraped) return bad('Could not reach that website. Check the address and try again.');

    const result = await multiStyles({
      companyName: scraped.title,
      sourceUrl: scraped.url,
      siteTitle: scraped.title,
      siteDescription: scraped.description,
      siteText: scraped.text,
      colorCandidates: scraped.colorCandidates,
      locale,
    });

    return ok({
      companyName: result.companyName,
      logoUrl: scraped.imageCandidates[0] ?? null,
      sourceUrl: scraped.url,
      styles: result.styles,
    });
  } catch (e) {
    return fail(e);
  }
}
