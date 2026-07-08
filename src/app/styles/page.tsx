import type { Metadata } from 'next';
import StylesClient from './styles-client';

export const metadata: Metadata = {
  title: 'Your Site in 4 Styles — Entrestate',
  description:
    'Paste your real estate website and see it reimagined in four art directions — free, in seconds.',
};

export default function StylesPage() {
  return <StylesClient />;
}
