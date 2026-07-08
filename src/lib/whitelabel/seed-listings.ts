import type { TenantListing } from '@/types';

/**
 * Demo inventory used to fill a freshly-provisioned tenant so the branded
 * system never looks empty. Scraped prospect listings always come first;
 * these seeds top the list up to six entries.
 */
const DEMO_LISTINGS: Omit<TenantListing, 'id' | 'fromProspect'>[] = [
  { title: 'Marina Vista Residences', area: 'Dubai Marina', price: 'AED 2.4M', bedrooms: '2 BR' },
  { title: 'Creek Harbour Signature', area: 'Dubai Creek Harbour', price: 'AED 1.9M', bedrooms: '1–2 BR' },
  { title: 'Palm Gateway Penthouse', area: 'Palm Jumeirah', price: 'AED 8.5M', bedrooms: '4 BR' },
  { title: 'Downtown Skyline Suites', area: 'Downtown Dubai', price: 'AED 3.2M', bedrooms: '2–3 BR' },
  { title: 'JVC Garden Collection', area: 'Jumeirah Village Circle', price: 'AED 980K', bedrooms: 'Studio–1 BR' },
  { title: 'Business Bay Waterfront', area: 'Business Bay', price: 'AED 1.6M', bedrooms: '1 BR' },
];

export function seedListings(prospectListings: TenantListing[], total = 6): TenantListing[] {
  const filled = [...prospectListings];
  for (const seed of DEMO_LISTINGS) {
    if (filled.length >= total) break;
    filled.push({ ...seed, id: `seed-${filled.length}`, fromProspect: false });
  }
  return filled.slice(0, total);
}
