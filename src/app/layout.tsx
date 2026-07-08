import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Entrestate — Your real estate business, white-labelled by AI',
  description:
    'Talk to our AI and watch your entire branded real estate system come alive in minutes. Sold by entrestate.com.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
