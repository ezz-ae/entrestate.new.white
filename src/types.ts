// White-label OS — tenant & voice-page domain types (standalone).

// ─── White-label tenants (sold via the /pitch AI-call funnel) ───────────────

export type TenantStatus = 'provisioning' | 'live' | 'claimed' | 'expired';
export type TenantLocale = 'en' | 'ar';

// Everything needed to render the system under the prospect's brand.
export interface TenantBrand {
  companyName: string;
  tagline?: string;
  logoUrl?: string | null;
  colors: { primary: string; accent: string; background?: string };
  contact?: { name?: string; phone?: string; email?: string; whatsapp?: string };
  locale: TenantLocale;
  /** Where the brand was learned from (prospect's site / instagram). */
  sourceUrl?: string;
}

export interface TenantListing {
  id: string;
  title: string;
  area: string;
  price?: string;
  bedrooms?: string;
  imageUrl?: string;
  /** true when scraped from the prospect's own site, false for seeded demo data */
  fromProspect: boolean;
}

export interface Tenant {
  id: string;
  /** URL-safe handle: /demo/[slug] today, [slug].entrestate.com later. */
  slug: string;
  status: TenantStatus;
  brand: TenantBrand;
  listings: TenantListing[];
  /** Millis. Demo tenants expire unless claimed. */
  createdAt: number;
  expiresAt: number;
  claimedBy?: string | null;
}

// ─── AI Voice Landing Pages (self-serve ad product) ─────────────────────────

export interface VoicePageListing {
  title: string;
  area: string;
  city?: string;
  price?: string;
  bedrooms?: string;
  handover?: string;
  paymentPlan?: string;
  description?: string;
  highlights?: string[];
}

// A buyer-facing landing page with an in-page AI voice agent, created by a
// user from their account and advertised directly (its URL is the ad's
// destination). Public at /v/[slug] and optionally on a connected domain.
export interface VoicePage {
  id: string;
  uid: string;
  slug: string;
  status: 'draft' | 'published';
  locale: TenantLocale;
  brand: TenantBrand;
  listing: VoicePageListing;
  /** Custom domain (host only, e.g. "offers.acme.ae") once connected. */
  customDomain?: string | null;
  /** Groups pages of one brand at /b/[brandSlug]. Derived from companyName. */
  brandSlug?: string;
  createdAt: number;
  updatedAt: number;
  leadCount: number;
  /** Analytics counters (best-effort, incremented server-side). */
  views?: number;
  calls?: number;
  /** Total AI conversation turns served — the usage/pricing meter. */
  turnCount?: number;
}
