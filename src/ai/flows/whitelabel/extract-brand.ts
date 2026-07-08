'use server';

/**
 * @fileOverview Extracts a white-label TenantBrand from a prospect's scraped
 * website. This is the "minutes to your system" engine behind the /pitch
 * AI-call funnel: company name + scraped signals in, ready-to-render brand
 * (colors, tagline, contact, listings) out.
 */

import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import {
  ExtractBrandInputSchema,
  ExtractBrandOutputSchema,
  type ExtractBrandInput,
  type ExtractBrandOutput,
} from './schemas';

export type { ExtractBrandInput, ExtractBrandOutput };

export async function extractBrand(input: ExtractBrandInput): Promise<ExtractBrandOutput> {
  return extractBrandFlow(input);
}

const extractBrandPrompt = ai.definePrompt({
  name: 'whitelabelExtractBrandPrompt',
  input: { schema: ExtractBrandInputSchema },
  output: { schema: ExtractBrandOutputSchema },
  model: googleAI.model('gemini-2.5-flash'),
  prompt: `You are the brand-provisioning engine for Entrestate's white-label real estate OS.
A prospect named their company "{{{companyName}}}" during a sales call. We scraped their public site.
Produce the brand configuration their personalized demo system will render with, immediately.

Scraped signals:
{{#if sourceUrl}}- URL: {{{sourceUrl}}}{{/if}}
{{#if siteTitle}}- Title: {{{siteTitle}}}{{/if}}
{{#if siteDescription}}- Description: {{{siteDescription}}}{{/if}}
{{#if colorCandidates}}- Colors seen in source (most frequent first): {{#each colorCandidates}}{{{this}}} {{/each}}{{/if}}
{{#if siteText}}- Page text: {{{siteText}}}{{/if}}

Rules:
- The demo must feel unmistakably THEIRS: name cased properly, colors plausibly theirs.
- Colors must have enough contrast to work as a UI theme on dark and light surfaces; never pick near-white or near-black as primary.
- Extract up to 6 real listings/projects only if genuinely present in the text — never invent listings.
- Tagline language: {{{locale}}} ("ar" means Modern Standard Arabic suitable for a Gulf audience).
- If there are no useful scraped signals, still produce a tasteful premium brand from the company name alone.`,
});

const extractBrandFlow = ai.defineFlow(
  {
    name: 'whitelabelExtractBrandFlow',
    inputSchema: ExtractBrandInputSchema,
    outputSchema: ExtractBrandOutputSchema,
  },
  async (input) => {
    const { output } = await extractBrandPrompt(input);
    if (!output) throw new Error('Brand extraction produced no output.');
    return output;
  },
);
