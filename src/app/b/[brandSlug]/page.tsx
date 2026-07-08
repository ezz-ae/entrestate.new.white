/**
 * /b/[brandSlug] — a brand's public mini-site: every published AI voice
 * landing page of one owner under one URL. This is the shareable "my
 * inventory" link (Listing-to-Landing) — each card opens the listing's
 * voice page.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Building2, MapPin, PhoneCall } from 'lucide-react';
import { listPublishedPagesByBrand } from '@/services/voice-pages';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ brandSlug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { brandSlug } = await params;
  const pages = await listPublishedPagesByBrand(decodeURIComponent(brandSlug)).catch(() => []);
  const brand = pages[0]?.brand;
  return {
    title: brand ? `${brand.companyName} — Properties` : 'Properties',
    description: brand?.tagline || 'Talk to our AI advisor about any of our properties.',
  };
}

export default async function BrandSitePage({ params }: Props) {
  const { brandSlug } = await params;
  const pages = await listPublishedPagesByBrand(decodeURIComponent(brandSlug)).catch(() => []);
  if (!pages.length) notFound();

  const brand = pages[0].brand;
  const dir = brand.locale === 'ar' ? 'rtl' : 'ltr';
  const vars = {
    '--b-primary': brand.colors.primary,
    '--b-accent': brand.colors.accent,
  } as React.CSSProperties;
  const monogram = brand.companyName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div dir={dir} style={vars} className="min-h-screen bg-[#07090d] text-white">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(55% 35% at 50% 0%, color-mix(in srgb, var(--b-primary) 20%, transparent), transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-10">
        <div className="flex items-center gap-4">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.companyName}
              className="h-14 w-14 rounded-2xl bg-white/90 object-contain p-1.5"
            />
          ) : (
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-black"
              style={{ background: 'var(--b-primary)' }}
            >
              {monogram}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{brand.companyName}</h1>
            {brand.tagline && <p className="truncate text-white/55">{brand.tagline}</p>}
          </div>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((p) => (
            <a
              key={p.id}
              href={`/v/${p.slug}`}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] transition hover:border-[var(--b-primary)]"
            >
              <div
                className="flex h-32 items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--b-primary) 35%, #0b0e14), color-mix(in srgb, var(--b-accent) 25%, #0b0e14))',
                }}
              >
                <Building2 className="h-9 w-9 text-white/70" />
              </div>
              <div className="p-4">
                <p className="truncate font-medium">{p.listing.title}</p>
                <p className="mt-0.5 flex items-center gap-1 truncate text-sm text-white/50">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {p.listing.area}
                  {p.listing.bedrooms ? ` · ${p.listing.bedrooms}` : ''}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  {p.listing.price ? (
                    <p className="font-semibold" style={{ color: 'var(--b-primary)' }}>
                      {p.listing.price}
                    </p>
                  ) : (
                    <span />
                  )}
                  <span className="flex items-center gap-1.5 text-xs text-white/60 group-hover:text-white">
                    <PhoneCall className="h-3.5 w-3.5" style={{ color: 'var(--b-primary)' }} />
                    {brand.locale === 'ar' ? 'تحدث مع المستشار' : 'Talk to the advisor'}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>

        <p className="mt-14 text-center text-xs text-white/35">
          Powered by <span className="font-semibold text-white/60">Entrestate</span> · entrestate.com
        </p>
      </div>
    </div>
  );
}
