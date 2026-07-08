/**
 * Zod schemas for the white-label funnel flows. Kept out of the 'use server'
 * flow modules because that directive only permits async-function exports.
 */

import { z } from 'genkit';

// ── extract-brand ────────────────────────────────────────────────────────────

export const ExtractBrandInputSchema = z.object({
  companyName: z.string().describe("The prospect's company name as they said it."),
  sourceUrl: z.string().optional().describe('The website that was scraped.'),
  siteTitle: z.string().optional(),
  siteDescription: z.string().optional(),
  siteText: z.string().optional().describe('Visible text scraped from their site.'),
  colorCandidates: z.array(z.string()).optional().describe('Hex colors seen in their page source, most frequent first.'),
  locale: z.enum(['en', 'ar']).describe('Language of the sales conversation.'),
});
export type ExtractBrandInput = z.infer<typeof ExtractBrandInputSchema>;

export const ExtractBrandOutputSchema = z.object({
  companyName: z.string().describe('Clean, properly-cased company name.'),
  tagline: z.string().describe('A short premium tagline for this brokerage, in the conversation locale. Invent a fitting one if the site has none.'),
  primaryColor: z.string().describe('Primary brand color as a hex code. Prefer a color from the candidates that looks like a brand color; otherwise pick one that suits a premium real estate brand.'),
  accentColor: z.string().describe('Accent color as a hex code, complementary to the primary.'),
  contactPhone: z.string().optional().describe('Phone number found on the site, if any.'),
  contactEmail: z.string().optional().describe('Email found on the site, if any.'),
  listings: z
    .array(
      z.object({
        title: z.string(),
        area: z.string().describe('Neighbourhood/community name.'),
        price: z.string().optional().describe('Price as displayed, with currency.'),
        bedrooms: z.string().optional(),
      }),
    )
    .describe('Up to 6 real listings/projects found in the site text. Empty array if none found.'),
});
export type ExtractBrandOutput = z.infer<typeof ExtractBrandOutputSchema>;

// ── seller-agent ─────────────────────────────────────────────────────────────

export const SellerAgentInputSchema = z.object({
  locale: z.enum(['en', 'ar']).describe('Conversation language.'),
  history: z
    .array(
      z.object({
        role: z.enum(['agent', 'prospect']),
        text: z.string().max(2000),
      }),
    )
    .max(60)
    .describe('Conversation so far, oldest first. Empty on the opening turn.'),
  state: z.object({
    companyName: z.string().optional().describe('Company name once known.'),
    websiteUrl: z.string().optional().describe('Website/Instagram once known.'),
    provisioning: z.boolean().optional().describe('True while their system is being built.'),
    tenantSlug: z.string().optional().describe('Set once their branded system is live.'),
    provisionFailed: z.boolean().optional().describe('True if the last provisioning attempt failed.'),
  }),
});
export type SellerAgentInput = z.infer<typeof SellerAgentInputSchema>;

export const SellerAgentOutputSchema = z.object({
  reply: z.string().describe('What the agent says next, in the conversation locale. 1–3 short spoken sentences. No markdown, no emoji.'),
  action: z
    .enum(['none', 'provision', 'reveal', 'close'])
    .describe(
      "'provision' the moment BOTH company name and website are known and no system exists yet. 'reveal' when tenantSlug is set and you are presenting their system. 'close' when inviting them to claim it. Otherwise 'none'.",
    ),
  companyName: z.string().optional().describe('Company name extracted from the conversation, when first understood.'),
  websiteUrl: z.string().optional().describe('Website or Instagram handle extracted from the conversation, when first understood.'),
});
export type SellerAgentOutput = z.infer<typeof SellerAgentOutputSchema>;

// ── buyer-agent (AI Voice Landing Pages) ─────────────────────────────────────

export const BuyerAgentInputSchema = z.object({
  locale: z.enum(['en', 'ar']).describe('Conversation language.'),
  page: z.object({
    companyName: z.string(),
    tagline: z.string().optional(),
    contactPhone: z.string().optional(),
    listing: z.object({
      title: z.string(),
      area: z.string(),
      city: z.string().optional(),
      price: z.string().optional(),
      bedrooms: z.string().optional(),
      handover: z.string().optional(),
      paymentPlan: z.string().optional(),
      description: z.string().optional(),
      highlights: z.array(z.string()).optional(),
    }),
  }),
  history: z
    .array(z.object({ role: z.enum(['agent', 'buyer']), text: z.string() }))
    .describe('Conversation so far, oldest first. Empty on the opening turn.'),
  state: z.object({
    leadCaptured: z.boolean().optional().describe('True once name+phone were saved.'),
  }),
});
export type BuyerAgentInput = z.infer<typeof BuyerAgentInputSchema>;

export const BuyerAgentOutputSchema = z.object({
  reply: z.string().describe('What the agent says next, in the conversation locale. 1–3 short spoken sentences. No markdown, no emoji.'),
  action: z
    .enum(['none', 'capture_lead', 'close'])
    .describe("'capture_lead' exactly when BOTH the buyer's name and phone number are known and not yet captured. 'close' after the lead is captured and goodbyes are done. Otherwise 'none'."),
  focus: z
    .enum(['overview', 'price', 'payment', 'location', 'contact'])
    .optional()
    .describe('Which canvas section the page should highlight for what you are talking about right now.'),
  leadName: z.string().optional().describe("Buyer's name once stated."),
  leadPhone: z.string().optional().describe("Buyer's phone number once stated."),
  leadNote: z.string().optional().describe('One-line summary of what the buyer wants, for the CRM.'),
});
export type BuyerAgentOutput = z.infer<typeof BuyerAgentOutputSchema>;

// ── multi-styles (From-Site Multi-Styles) ────────────────────────────────────

export const MultiStylesInputSchema = z.object({
  companyName: z.string().optional().describe('Company name if known (falls back to the site title).'),
  sourceUrl: z.string().optional(),
  siteTitle: z.string().optional(),
  siteDescription: z.string().optional(),
  siteText: z.string().optional().describe('Visible text scraped from the site.'),
  colorCandidates: z.array(z.string()).optional().describe('Hex colors seen in the page source, most frequent first.'),
  locale: z.enum(['en', 'ar']),
});
export type MultiStylesInput = z.infer<typeof MultiStylesInputSchema>;

export const MultiStylesOutputSchema = z.object({
  companyName: z.string().describe('Clean, properly-cased company name.'),
  styles: z
    .array(
      z.object({
        name: z.string().describe("Short style name, e.g. 'Midnight Luxe', 'Desert Minimal'."),
        vibe: z.string().describe('One sentence describing the style direction.'),
        primary: z.string().describe('Primary color hex. Strong enough to work as a UI theme.'),
        accent: z.string().describe('Accent color hex, complementary to the primary.'),
        surface: z.string().describe('Background surface color hex (dark or light, per the style).'),
        dark: z.boolean().describe('True if the surface is dark and text should be light.'),
        tagline: z.string().describe('A brand tagline in this style voice, in the requested locale.'),
        heroTitle: z.string().describe('A hero headline for their homepage in this style, in the requested locale.'),
        heroSubtitle: z.string().describe('One supporting hero sentence, in the requested locale.'),
      }),
    )
    .length(4)
    .describe('Exactly 4 clearly distinct style directions: one faithful to their current brand, one dark-luxury, one minimal-light, one bold-modern.'),
});
export type MultiStylesOutput = z.infer<typeof MultiStylesOutputSchema>;
