'use client';

/**
 * /styles — From-Site Multi-Styles, the free top-of-funnel tool.
 *
 * Paste a real-estate site URL → four art directions render as live mini-site
 * previews (header, hero, listing strip) in each style's palette and voice.
 * Every preview's CTA leads to /pitch, where the seller agent builds the
 * real system.
 */

import { useState } from 'react';
import { ArrowRight, Building2, Globe, Loader2, Palette, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface StyleDirection {
  name: string;
  vibe: string;
  primary: string;
  accent: string;
  surface: string;
  dark: boolean;
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
}

interface StylesResult {
  companyName: string;
  logoUrl: string | null;
  sourceUrl: string;
  styles: StyleDirection[];
}

export default function StylesClient() {
  const [url, setUrl] = useState('');
  const [locale, setLocale] = useState<'en' | 'ar'>('en');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StylesResult | null>(null);

  const generate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/whitelabel/styles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl: url.trim(), locale }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Something went wrong.');
      setResult(json.data as StylesResult);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const monogram = (name: string) =>
    name
      .split(/\s+/)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  return (
    <div className="min-h-screen bg-[#07090d] text-white">
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-12">
        <div className="text-center">
          <p className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
            <Palette className="h-4 w-4" /> Free tool
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            Your site.
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              {' '}
              Four new styles.
            </span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-white/60">
            Paste your real estate website. Our AI reads your brand and reimagines it in four art
            directions — in seconds.
          </p>

          <form onSubmit={generate} className="mx-auto mt-8 flex max-w-xl items-center gap-2">
            <div className="relative flex-1">
              <Globe className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="yourbrand.ae"
                className="h-12 rounded-full border-white/15 bg-white/[0.06] ps-9 text-white placeholder:text-white/35"
              />
            </div>
            <select
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'en' | 'ar')}
              className="h-12 rounded-full border border-white/15 bg-white/[0.06] px-3 text-sm text-white"
            >
              <option value="en" className="bg-[#07090d]">EN</option>
              <option value="ar" className="bg-[#07090d]">عربي</option>
            </select>
            <Button
              type="submit"
              disabled={loading || !url.trim()}
              className="h-12 rounded-full bg-emerald-400 px-6 font-semibold text-black hover:bg-emerald-300"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate'}
            </Button>
          </form>
          {loading && (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/50">
              <Sparkles className="h-4 w-4 animate-pulse text-emerald-300" />
              Reading your brand, designing four directions…
            </p>
          )}
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>

        {result && (
          <div className="mt-12">
            <p className="mb-6 text-center text-sm text-white/50">
              Four directions for <span className="font-semibold text-white/80">{result.companyName}</span>
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              {result.styles.map((s) => {
                const text = s.dark ? '#ffffff' : '#101418';
                const subtext = s.dark ? 'rgba(255,255,255,0.65)' : 'rgba(16,20,24,0.65)';
                const line = s.dark ? 'rgba(255,255,255,0.12)' : 'rgba(16,20,24,0.12)';
                return (
                  <div key={s.name} className="overflow-hidden rounded-3xl border border-white/10">
                    {/* mini-site preview rendered fully in the style's palette */}
                    <div style={{ background: s.surface, color: text }}>
                      <div
                        className="flex items-center justify-between px-5 py-3"
                        style={{ borderBottom: `1px solid ${line}` }}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
                            style={{ background: s.primary, color: s.dark ? '#101418' : '#ffffff' }}
                          >
                            {monogram(result.companyName)}
                          </div>
                          <span className="text-sm font-semibold">{result.companyName}</span>
                        </div>
                        <div className="flex gap-3 text-xs" style={{ color: subtext }}>
                          <span>Projects</span>
                          <span>Areas</span>
                          <span style={{ color: s.primary, fontWeight: 600 }}>Contact</span>
                        </div>
                      </div>
                      <div className="px-5 py-7" dir={/[؀-ۿ]/.test(s.heroTitle) ? 'rtl' : 'ltr'}>
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: s.primary }}>
                          {s.tagline}
                        </p>
                        <h3 className="mt-2 text-xl font-bold leading-snug">{s.heroTitle}</h3>
                        <p className="mt-1.5 text-sm" style={{ color: subtext }}>
                          {s.heroSubtitle}
                        </p>
                        <div className="mt-4 flex gap-2">
                          {[0, 1, 2].map((i) => (
                            <div
                              key={i}
                              className="flex h-14 flex-1 items-center justify-center rounded-lg"
                              style={{
                                background: `linear-gradient(135deg, ${s.primary}${s.dark ? '55' : '33'}, ${s.accent}${s.dark ? '40' : '26'})`,
                              }}
                            >
                              <Building2 className="h-5 w-5" style={{ color: subtext }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    {/* style meta + CTA */}
                    <div className="flex items-center justify-between gap-3 bg-white/[0.04] px-5 py-4">
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-sm font-semibold">
                          {s.name}
                          <span className="flex gap-1">
                            {[s.primary, s.accent, s.surface].map((c) => (
                              <span
                                key={c}
                                className="inline-block h-3 w-3 rounded-full border border-white/20"
                                style={{ background: c }}
                              />
                            ))}
                          </span>
                        </p>
                        <p className="truncate text-xs text-white/50">{s.vibe}</p>
                      </div>
                      <Button
                        asChild
                        size="sm"
                        className="shrink-0 rounded-full bg-emerald-400 font-semibold text-black hover:bg-emerald-300"
                      >
                        <a href={`/pitch${locale === 'ar' ? '?lang=ar' : ''}`}>
                          Build it <ArrowRight className="ms-1.5 h-3.5 w-3.5" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-8 text-center text-sm text-white/50">
              Any of these can be your live system — site, listings, CRM, and an AI that talks to
              your buyers.{' '}
              <a href={`/pitch${locale === 'ar' ? '?lang=ar' : ''}`} className="font-semibold text-emerald-300 hover:underline">
                Talk to the AI and watch it build yours →
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
