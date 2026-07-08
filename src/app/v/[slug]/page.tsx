/**
 * /v/[slug] — public AI Voice Landing Page (the ad's destination).
 *
 * Also serves connected custom domains: the middleware rewrites any unknown
 * host to /v/~<host>, and a slug starting with "~" is resolved by domain.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getPublishedVoicePageByDomain,
  getPublishedVoicePageBySlug,
} from '@/services/voice-pages';
import type { VoicePage } from '@/types';
import VoicePageClient from './voice-page-client';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

async function resolvePage(rawSlug: string): Promise<VoicePage | null> {
  const slug = decodeURIComponent(rawSlug);
  try {
    return slug.startsWith('~')
      ? await getPublishedVoicePageByDomain(slug.slice(1))
      : await getPublishedVoicePageBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await resolvePage(slug);
  if (!page) return { title: 'Not found' };
  return {
    title: `${page.listing.title} · ${page.brand.companyName}`,
    description:
      page.listing.description?.slice(0, 160) ||
      `${page.listing.title} — ${page.listing.area}. Talk to our AI advisor now.`,
  };
}

export default async function PublicVoicePage({ params }: Props) {
  const { slug } = await params;
  const page = await resolvePage(slug);
  if (!page) notFound();
  return <VoicePageClient page={page} />;
}
