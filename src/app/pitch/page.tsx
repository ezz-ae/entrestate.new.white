import type { Metadata } from 'next';
import PitchClient from './pitch-client';

export const metadata: Metadata = {
  title: 'See Your System — Entrestate',
  description:
    'Talk to our AI and watch your entire real estate operating system — your brand, your listings, your AI — come alive in minutes.',
  robots: { index: false }, // ad landing page; keep out of organic search
};

export default function PitchPage() {
  return <PitchClient />;
}
