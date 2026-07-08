/**
 * /demo/[slug] — the prospect's white-label system, live under their brand.
 *
 * This is what the /pitch call provisions and reveals. It renders the OS
 * shell (dashboard modules + listings) themed entirely from the tenant's
 * brand. Path-based today; the same tenant record will back
 * [slug].entrestate.com once wildcard domains are wired up.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  Bot,
  Building2,
  Globe,
  LineChart,
  Megaphone,
  MessageCircle,
  Users,
} from 'lucide-react';
import { getTenantBySlug } from '@/services/tenants';
import type { Tenant } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  return {
    title: tenant ? `${tenant.brand.companyName} — Powered by Entrestate` : 'Demo — Entrestate',
    robots: { index: false },
  };
}

const AR = {
  demo: 'نسخة تجريبية — تنتهي خلال ٧ أيام',
  claim: 'احجز نظامك',
  listings: 'العقارات',
  expiredTitle: 'انتهت صلاحية هذه النسخة التجريبية',
  expiredBody: 'تحدث معنا مرة أخرى وسنبنيها من جديد خلال دقائق.',
  rebuild: 'ابدأ مكالمة جديدة',
  poweredBy: 'مشغّل بواسطة',
  modules: [
    { icon: 'globe', label: 'موقعك الإلكتروني' },
    { icon: 'users', label: 'إدارة العملاء' },
    { icon: 'whatsapp', label: 'أتمتة واتساب' },
    { icon: 'bot', label: 'وكيل مبيعات ذكي' },
    { icon: 'chart', label: 'ذكاء السوق' },
    { icon: 'ads', label: 'استوديو الإعلانات' },
  ],
};

const EN = {
  demo: 'Demo — expires in 7 days',
  claim: 'Claim your system',
  listings: 'Listings',
  expiredTitle: 'This demo has expired',
  expiredBody: 'Talk to us again and we will rebuild it in minutes.',
  rebuild: 'Start a new call',
  poweredBy: 'Powered by',
  modules: [
    { icon: 'globe', label: 'Branded Website' },
    { icon: 'users', label: 'CRM & Leads' },
    { icon: 'whatsapp', label: 'WhatsApp Automation' },
    { icon: 'bot', label: 'AI Sales Agent' },
    { icon: 'chart', label: 'Market Intelligence' },
    { icon: 'ads', label: 'Ads Studio' },
  ],
};

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  globe: Globe,
  users: Users,
  whatsapp: MessageCircle,
  bot: Bot,
  chart: LineChart,
  ads: Megaphone,
};

function Monogram({ tenant }: { tenant: Tenant }) {
  const initials = tenant.brand.companyName
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className="flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-black"
      style={{ background: 'var(--tenant-primary)' }}
    >
      {initials}
    </div>
  );
}

export default async function TenantDemoPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await getTenantBySlug(slug).catch(() => null);
  if (!tenant) notFound();

  const { brand } = tenant;
  const t = brand.locale === 'ar' ? AR : EN;
  const dir = brand.locale === 'ar' ? 'rtl' : 'ltr';
  const vars = {
    '--tenant-primary': brand.colors.primary,
    '--tenant-accent': brand.colors.accent,
  } as React.CSSProperties;

  if (tenant.status === 'expired') {
    return (
      <div dir={dir} style={vars} className="flex min-h-screen flex-col items-center justify-center bg-[#07090d] px-6 text-center text-white">
        <Monogram tenant={tenant} />
        <h1 className="mt-6 text-2xl font-semibold">{t.expiredTitle}</h1>
        <p className="mt-2 max-w-sm text-white/55">{t.expiredBody}</p>
        <a
          href={`/pitch${brand.locale === 'ar' ? '?lang=ar' : ''}`}
          className="mt-8 rounded-full px-8 py-3 font-semibold text-black"
          style={{ background: 'var(--tenant-primary)' }}
        >
          {t.rebuild}
        </a>
      </div>
    );
  }

  return (
    <div dir={dir} style={vars} className="min-h-screen bg-[#07090d] text-white">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(55% 35% at 50% 0%, color-mix(in srgb, var(--tenant-primary) 20%, transparent), transparent 70%)',
        }}
      />
      <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-8">
        {/* header */}
        <div className="flex flex-wrap items-center gap-4">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={brand.logoUrl}
              alt={brand.companyName}
              className="h-14 w-14 rounded-2xl bg-white/90 object-contain p-1.5"
            />
          ) : (
            <Monogram tenant={tenant} />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold">{brand.companyName}</h1>
            {brand.tagline && <p className="truncate text-white/55">{brand.tagline}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">
              {t.demo}
            </span>
            <a
              href={`/pricing?claim=${tenant.slug}`}
              className="rounded-full px-5 py-2 text-sm font-semibold text-black"
              style={{ background: 'var(--tenant-primary)' }}
            >
              {t.claim}
            </a>
          </div>
        </div>

        {/* modules grid */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {t.modules.map(({ icon, label }) => {
            const Icon = MODULE_ICONS[icon];
            return (
              <div
                key={label}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.07]"
              >
                <div
                  className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl"
                  style={{ background: 'color-mix(in srgb, var(--tenant-primary) 18%, transparent)' }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium">{label}</p>
              </div>
            );
          })}
        </div>

        {/* listings */}
        <h2 className="mt-12 text-lg font-semibold">{t.listings}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tenant.listings.map((l) => (
            <div
              key={l.id}
              className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]"
            >
              <div
                className="flex h-28 items-center justify-center"
                style={{
                  background:
                    'linear-gradient(135deg, color-mix(in srgb, var(--tenant-primary) 35%, #0b0e14), color-mix(in srgb, var(--tenant-accent) 25%, #0b0e14))',
                }}
              >
                <Building2 className="h-8 w-8 text-white/70" />
              </div>
              <div className="p-4">
                <p className="truncate font-medium">{l.title}</p>
                <p className="mt-0.5 truncate text-sm text-white/50">
                  {l.area}
                  {l.bedrooms ? ` · ${l.bedrooms}` : ''}
                </p>
                {l.price && (
                  <p className="mt-2 font-semibold" style={{ color: 'var(--tenant-primary)' }}>
                    {l.price}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="mt-14 text-center text-xs text-white/35">
          {t.poweredBy} <span className="font-semibold text-white/60">Entrestate</span> · entrestate.com
        </p>
      </div>
    </div>
  );
}
