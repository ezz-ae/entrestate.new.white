'use server';

/**
 * @fileoverview Firestore service for white-label demo tenants.
 *
 * Tenants are created by the /pitch AI-call funnel: the seller agent collects
 * a prospect's company name + website, the provisioning API extracts their
 * brand and seeds listings, and the resulting tenant renders the whole system
 * under the prospect's brand at /demo/[slug]. Unclaimed demos expire.
 */

import { adminDb } from '@/lib/firebaseAdmin';
import type { Tenant, TenantBrand, TenantListing, TenantStatus } from '@/types';

const COLLECTION = 'tenants';
const DEMO_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function requireDb() {
  if (!adminDb) throw new Error('Tenant service unavailable: Firestore Admin is not initialized.');
  return adminDb;
}

export async function slugify(name: string): Promise<string> {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'brand';
}

/** Create a tenant in `provisioning` state and reserve a unique slug. */
export async function createTenant(brand: TenantBrand): Promise<Tenant> {
  const db = requireDb();
  const base = await slugify(brand.companyName);
  let slug = base;
  // Suffix -2, -3… if the slug is taken (bounded; slugs are short-lived demos).
  for (let i = 2; i <= 20; i++) {
    const existing = await db.collection(COLLECTION).where('slug', '==', slug).limit(1).get();
    if (existing.empty) break;
    slug = `${base}-${i}`;
  }
  const now = Date.now();
  const ref = db.collection(COLLECTION).doc();
  const tenant: Tenant = {
    id: ref.id,
    slug,
    status: 'provisioning',
    brand,
    listings: [],
    createdAt: now,
    expiresAt: now + DEMO_TTL_MS,
    claimedBy: null,
  };
  await ref.set(tenant);
  return tenant;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const db = requireDb();
  const snap = await db.collection(COLLECTION).where('slug', '==', slug).limit(1).get();
  if (snap.empty) return null;
  const tenant = snap.docs[0].data() as Tenant;
  // Lazily reflect expiry so readers never see a stale "live" demo.
  if (tenant.status === 'live' && tenant.expiresAt < Date.now()) {
    await snap.docs[0].ref.update({ status: 'expired' });
    return { ...tenant, status: 'expired' };
  }
  return tenant;
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const db = requireDb();
  const doc = await db.collection(COLLECTION).doc(id).get();
  return doc.exists ? (doc.data() as Tenant) : null;
}

export async function updateTenant(
  id: string,
  patch: Partial<Pick<Tenant, 'status' | 'brand' | 'listings' | 'claimedBy'>>,
): Promise<void> {
  const db = requireDb();
  await db.collection(COLLECTION).doc(id).update(patch as Record<string, unknown>);
}

export async function markTenantLive(
  id: string,
  brand: TenantBrand,
  listings: TenantListing[],
): Promise<void> {
  await updateTenant(id, { status: 'live' as TenantStatus, brand, listings });
}
