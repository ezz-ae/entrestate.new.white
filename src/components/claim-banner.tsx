'use client';

/**
 * Claim banner for /pricing?claim=[tenantSlug] — the landing spot of the
 * /pitch close and demo-page CTAs. Shows the prospect's provisioned demo and
 * captures their contact as a claim request (Entrestate's own sales lead).
 * Renders nothing without the query param.
 */

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Tenant } from '@/types';

export function ClaimBanner() {
  const slug = useSearchParams().get('claim');
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/whitelabel/tenant/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => j?.ok && setTenant(j.data.tenant as Tenant))
      .catch(() => {});
  }, [slug]);

  if (!slug || !tenant) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/whitelabel/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantSlug: slug, name, phone, email }),
      });
      const json = await res.json();
      if (!json?.ok) throw new Error(json?.error || 'Could not submit.');
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mb-10 max-w-3xl rounded-3xl border p-6" style={{ borderColor: tenant.brand.colors.primary }}>
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-black"
          style={{ background: tenant.brand.colors.primary }}
        >
          {tenant.brand.companyName
            .split(/\s+/)
            .map((w) => w[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold">
            <Sparkles className="h-4 w-4" style={{ color: tenant.brand.colors.primary }} />
            Claim {tenant.brand.companyName}
          </p>
          <p className="text-sm text-muted-foreground">
            Your demo system is live at{' '}
            <a href={`/demo/${tenant.slug}`} target="_blank" rel="noreferrer" className="underline">
              /demo/{tenant.slug}
            </a>
            . Leave your details and we finalize your plan with you.
          </p>
        </div>
      </div>

      {done ? (
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-emerald-500">
          <CheckCircle2 className="h-4 w-4" /> Received — we will contact you within one business day.
          Your demo stays live meanwhile.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-wrap items-center gap-2">
          <Input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="h-10 max-w-44"
          />
          <Input
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone / WhatsApp"
            className="h-10 max-w-48"
          />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email (optional)"
            className="h-10 max-w-56"
          />
          <Button type="submit" disabled={busy} className="h-10">
            {busy && <Loader2 className="me-1.5 h-4 w-4 animate-spin" />}
            Claim my system
          </Button>
          {error && <p className="w-full text-sm text-red-500">{error}</p>}
        </form>
      )}
    </div>
  );
}
