'use server';

/**
 * @fileOverview From-Site Multi-Styles — the free top-of-funnel tool.
 *
 * Point the brand scraper at any real-estate site and generate four clearly
 * distinct site style directions (colors, voice, hero copy) the /styles page
 * renders as live mini-previews. Every preview funnels into /pitch, where the
 * seller agent builds the real thing.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import {
  MultiStylesInputSchema,
  MultiStylesOutputSchema,
  type MultiStylesInput,
  type MultiStylesOutput,
} from './schemas';

export type { MultiStylesInput, MultiStylesOutput };

export async function multiStyles(input: MultiStylesInput): Promise<MultiStylesOutput> {
  return multiStylesFlow(input);
}

const multiStylesPrompt = ai.definePrompt({
  name: 'whitelabelMultiStylesPrompt',
  input: { schema: MultiStylesInputSchema },
  output: { schema: MultiStylesOutputSchema },
  model: googleAI.model('gemini-2.5-flash'),
  prompt: `You are Entrestate's brand stylist. A real-estate professional pasted their website URL;
we scraped it. Produce EXACTLY four clearly distinct style directions for their brand — each one
must feel like a finished art direction for a premium property website, not a color swap.

Scraped signals:
{{#if companyName}}- Company: {{{companyName}}}{{/if}}
{{#if sourceUrl}}- URL: {{{sourceUrl}}}{{/if}}
{{#if siteTitle}}- Title: {{{siteTitle}}}{{/if}}
{{#if siteDescription}}- Description: {{{siteDescription}}}{{/if}}
{{#if colorCandidates}}- Colors seen on their site: {{#each colorCandidates}}{{{this}}} {{/each}}{{/if}}
{{#if siteText}}- Page text: {{{siteText}}}{{/if}}

The four directions, in order:
1. FAITHFUL — their current brand, refined: keep their color world (use the scraped candidates), tighten the voice.
2. DARK LUXURY — deep dark surface, gold/champagne or jewel accent, exclusive tone.
3. MINIMAL LIGHT — near-white surface, one restrained accent, editorial confidence.
4. BOLD MODERN — saturated statement primary, high-energy copy, startup pace.

Rules:
- Copy (tagline, heroTitle, heroSubtitle) in {{{locale}}} ("ar" = Modern Standard Arabic, Gulf market tone). Style names and vibe stay in English.
- All colors as 6-digit hex. primary/accent must contrast well against the chosen surface; never near-white primaries on light surfaces or near-black on dark.
- Hero copy is about THEIR company and market, grounded in the scraped text when available — never generic filler like "Welcome to our website".
- If scraping produced nothing useful, still deliver four excellent directions from the company name alone.`,
});

const multiStylesFlow = ai.defineFlow(
  {
    name: 'whitelabelMultiStylesFlow',
    inputSchema: MultiStylesInputSchema,
    outputSchema: MultiStylesOutputSchema,
  },
  async (input) => {
    const { output } = await multiStylesPrompt(input);
    if (!output) throw new Error('Style generation produced no output.');
    return output;
  },
);
