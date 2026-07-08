import { Suspense } from 'react';
import { Check } from 'lucide-react';
import { ClaimBanner } from '@/components/claim-banner';

export const metadata = { title: 'Plans & Pricing — Entrestate' };

const tiers = [
  {
    name: 'Voice Pages',
    price: '$399',
    per: '/mo',
    for: 'Solo agents',
    features: ['AI voice landing pages', 'Leads into your CRM', 'Your brand & colors', 'From-site styles'],
  },
  {
    name: 'Brokerage',
    price: '$999',
    per: '/mo',
    for: 'Teams',
    highlight: true,
    features: ['Everything in Voice Pages', 'Branded site + listings', 'CRM & WhatsApp automation', 'Custom domain'],
  },
  {
    name: 'Empire',
    price: '$2,500',
    per: '/mo',
    for: 'Established brokerages',
    features: ['Everything in Brokerage', 'AI voice for your buyers', 'Ads studio + analytics', 'Priority support'],
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-12">
        <Suspense fallback={null}>
          <ClaimBanner />
        </Suspense>

        <div className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Plans & Pricing</h1>
          <p className="mt-3 text-white/55">
            From solo agents to established brokerages. AI voice minutes metered above each plan&apos;s quota.
          </p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`rounded-3xl border p-6 ${
                t.highlight ? 'border-emerald-400/50 bg-emerald-400/[0.06]' : 'border-white/10 bg-white/[0.04]'
              }`}
            >
              <p className="text-sm text-white/50">{t.for}</p>
              <h3 className="mt-1 text-xl font-semibold">{t.name}</h3>
              <p className="mt-3">
                <span className="text-3xl font-bold">{t.price}</span>
                <span className="text-white/50">{t.per}</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-white/75">
                    <Check className="h-4 w-4 text-emerald-300" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
