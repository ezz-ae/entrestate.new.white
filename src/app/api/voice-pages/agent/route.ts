/**
 * POST /api/voice-pages/agent — one buyer-conversation turn on a published
 * voice landing page. Public (the buyer came from an ad). The page's data is
 * loaded server-side by slug — the client never supplies listing facts — and
 * a capture_lead action is persisted here, server-side, into the owner's CRM.
 */

import { z } from 'zod';
import { ok, bad, fail } from '@/lib/api-helpers';
import { buyerAgent } from '@/ai/flows/whitelabel/buyer-agent';
import { addVoicePageLead, getMonthlyUsage, getPublishedVoicePageBySlug, recordAgentTurn } from '@/services/voice-pages';
import { LIMITS, checkRateLimit, requestIp, tooMany } from '@/lib/whitelabel/rate-limit';

export const maxDuration = 30;

const turnSchema = z.object({
  slug: z.string().min(1).max(64),
  locale: z.enum(['en', 'ar']),
  history: z
    .array(z.object({ role: z.enum(['agent', 'buyer']), text: z.string().max(2000) }))
    .max(60),
  state: z.object({ leadCaptured: z.boolean().optional() }),
});

export async function POST(req: Request) {
  const rl = await checkRateLimit(`buyer:ip:${requestIp(req)}`, LIMITS.buyerTurnsPerIp(), 600);
  if (!rl.allowed) return tooMany(rl.retryAfterSec);

  const body = await req.json().catch(() => null);
  const parsed = turnSchema.safeParse(body);
  if (!parsed.success) return bad('Invalid agent input.');
  const { slug, locale, history, state } = parsed.data;

  try {
    const page = await getPublishedVoicePageBySlug(slug);
    if (!page) return bad('Page not found.', 404);

    // Abuse ceiling per ad page, plus the tier quota hook per owner.
    const pageCap = await checkRateLimit(`buyer:page:${page.id}`, LIMITS.buyerTurnsPerPagePerDay(), 86400);
    if (!pageCap.allowed) return tooMany(pageCap.retryAfterSec, 'This page is very busy right now. Please try again later.');
    const monthlyLimit = LIMITS.ownerTurnsPerMonth();
    if (monthlyLimit > 0) {
      const usage = await getMonthlyUsage(page.uid);
      if (usage.voiceTurns >= monthlyLimit) {
        return tooMany(3600, 'The AI advisor is unavailable right now. Please use the contact details on this page.');
      }
    }

    const output = await buyerAgent({
      locale,
      page: {
        companyName: page.brand.companyName,
        tagline: page.brand.tagline,
        contactPhone: page.brand.contact?.phone,
        listing: page.listing,
      },
      history,
      state,
    });

    await recordAgentTurn(page);

    let leadCaptured = state.leadCaptured ?? false;
    if (output.action === 'capture_lead' && !leadCaptured && output.leadName && output.leadPhone) {
      await addVoicePageLead(page, {
        name: output.leadName,
        phone: output.leadPhone,
        note: output.leadNote,
      });
      leadCaptured = true;
    }

    // Never echo captured PII back beyond what the client already said.
    return ok({ reply: output.reply, action: output.action, focus: output.focus, leadCaptured });
  } catch (e) {
    return fail(e);
  }
}
