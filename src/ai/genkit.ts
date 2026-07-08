// Server-side Genkit singleton. Deliberately NOT a 'use server' module: that
// directive is for Server Actions and forbids object exports like `ai`.

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Firebase telemetry (@genkit-ai/firebase) is intentionally NOT enabled here:
// it pulls in the OpenTelemetry/winston instrumentation chain, which fails to
// bundle cleanly on some hosts (Module not found: @opentelemetry/winston-transport)
// and adds build weight for no functional benefit. Re-add it behind an env flag
// only if you actually need Genkit → Firebase tracing.

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1',
    }),
  ],
  // Default model for every definePrompt/generate that doesn't set one, so no
  // flow can throw "Must supply a model" at runtime.
  model: googleAI.model('gemini-2.5-flash'),
});
