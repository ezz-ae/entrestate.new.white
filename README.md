# Entrestate — White-Label Real Estate OS

The standalone white-label system sold by **entrestate.com**: an AI-native real
estate operating system that a brokerage gets under **their brand, their domain,
their data** — provisioned live during an AI sales call.

This repo is the clean extraction of the white-label engine (the funnel + the
public product surface), purpose-built as its own app with no host-account
baggage. Next.js 15 (App Router) · Genkit + Gemini · Firebase Admin (Firestore).

## The experience

```
Instagram ad (Arabic first, then Russian, Urdu)
   → /pitch      in-browser AI voice call (Web Speech API, en / ?lang=ar, text fallback)
   → the AI collects company name + website, then provisions their branded system LIVE:
        scrape site → extract brand (Gemini) → create tenant → seed listings
   → the page MORPHS into their system; the AI narrates the reveal and closes
   → /demo/[slug]  their live branded system (7-day demo)
   → /pricing?claim=[slug]  claim it (captured as a sales lead)
```

Plus the buyer-facing product and the free hook:

- **AI Voice Landing Pages** — `/v/[slug]`: a listing page whose destination is
  an in-page AI voice advisor that answers only from the listing facts, steers
  the canvas, and captures buyer leads. Custom domains via `middleware.ts`
  (unknown host → `/v/~<host>`). Brand mini-site at `/b/[brandSlug]`.
- **From-Site Multi-Styles** — `/styles`: paste a site → four branded art
  directions, each CTA'ing into `/pitch`. Free top-of-funnel.

## Routes

| Path | What |
|---|---|
| `/` | Marketing landing |
| `/pitch` | The demo-led AI sales call |
| `/styles` | Free four-styles tool |
| `/demo/[slug]` | A provisioned tenant's branded system |
| `/v/[slug]` | A buyer-facing AI voice landing page |
| `/b/[brandSlug]` | A brand's public mini-site of voice pages |
| `/pricing` | Plans + claim banner (`?claim=[slug]`) |
| `POST /api/whitelabel/provision` | Scrape + extract brand + create tenant |
| `POST /api/whitelabel/agent` | One seller-agent turn |
| `POST /api/whitelabel/styles` | Four style directions from a URL |
| `POST /api/whitelabel/claim` | Record claim intent → sales pipeline |
| `GET /api/whitelabel/tenant/[slug]` | Public tenant read (PII-stripped) |
| `POST /api/voice-pages/agent` | One buyer-agent turn (+ lead capture, metering) |
| `POST /api/voice-pages/track` | Analytics beacon (views/calls) |

## Architecture

- **Tenant-first.** `src/services/tenants.ts` + `src/services/voice-pages.ts`
  own the Firestore domain (`tenants`, `voicePages`, `claims`, `pitchSessions`,
  `rateLimits`, per-owner `users/{uid}/leads` and `/usage`).
- **AI flows** are Genkit + Gemini in `src/ai/flows/whitelabel/` (seller,
  buyer, brand-extraction, multi-styles); schemas isolated in `schemas.ts`.
  `src/ai/genkit.ts` sets a default model so every prompt resolves.
- **Public surface is rate-limited** (`src/lib/whitelabel/rate-limit.ts`,
  Firestore fixed-window, env-tunable) with an owner monthly-quota hook for
  pricing tiers. The brand scraper (`scrape.ts`) is SSRF-guarded.
- Voice I/O is the browser Web Speech API today; the agent flows and their
  action contracts are stack-agnostic, so a hosted voice stack swaps in without
  touching them.

## Getting started

```bash
npm install
cp .env.example .env.local   # add GEMINI_API_KEY + Firebase Admin creds
npm run dev
```

`npm run typecheck` and `npm run build` gate CI (`.github/workflows/ci.yml`).

## Roadmap (next phases)

1. **Account & studio layer** — auth so owners self-serve their voice pages
   (the create/manage/publish studio + owner CRUD APIs), plus the ops pipeline
   view for `claims` / `pitchSessions`.
2. **Billing** — Stripe behind `/pricing?claim=`; demo→paid conversion; wire
   `WL_OWNER_TURNS_MONTHLY` per plan (replace the env with a per-tenant lookup).
3. **Inventory** — a market listings feed as the source for Listing-to-Landing
   + bulk page creation.
4. **Hosted voice** — swap browser speech for phone-quality Arabic.
5. **Wildcard domains** — `[slug].entrestate.com` backed by the tenant record.

## Ground rules

One platform, sold as focused products (entitlement cuts). The demo is the
product. One language per campaign. Every tenant sees only their own brand and
data. This system is independent — it touches no other company's app or data.
