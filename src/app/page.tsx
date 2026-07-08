import Link from 'next/link';
import { ArrowRight, Bot, Building2, Mic, Palette, PhoneCall, Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Entrestate — Your brokerage, built by AI in minutes',
};

const products = [
  {
    icon: PhoneCall,
    title: 'The AI sales call',
    body: 'Prospects click your ad and land in a live voice call. The AI builds their fully-branded system while they talk, then closes.',
    href: '/pitch',
    cta: 'See the pitch',
  },
  {
    icon: Palette,
    title: 'Four styles from any site',
    body: 'Paste a real-estate website and get four finished brand directions in seconds. Free — and every one funnels into a build.',
    href: '/styles',
    cta: 'Try it free',
  },
  {
    icon: Mic,
    title: 'AI Voice Landing Pages',
    body: 'A landing page whose destination is an AI voice call about one listing — canvas personalising live, leads captured into the CRM.',
    href: '/pitch',
    cta: 'Build one',
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#07090d] text-white">
      <div className="mx-auto max-w-5xl px-5 pb-20 pt-10">
        <header className="flex items-center justify-between">
          <span className="flex items-center gap-2 font-semibold tracking-wide">
            <Sparkles className="h-4 w-4 text-emerald-300" /> Entrestate
          </span>
          <Link
            href="/pitch"
            className="rounded-full bg-emerald-400 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-300"
          >
            Talk to it
          </Link>
        </header>

        <section className="flex flex-col items-center pt-24 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
            White-label real estate OS
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">
            Your entire brokerage.
            <span className="block bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              Your brand. Built on a call.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-white/60">
            An AI-native operating system — branded site, listings, CRM, and an AI that talks to
            your buyers — provisioned live while you talk to it.
          </p>
          <Link
            href="/pitch"
            className="mt-10 inline-flex h-14 items-center rounded-full bg-emerald-400 px-10 text-base font-semibold text-black hover:bg-emerald-300"
          >
            <Bot className="me-2 h-5 w-5" /> Show me my system
          </Link>
        </section>

        <section className="mt-28 grid gap-5 md:grid-cols-3">
          {products.map((p) => (
            <div key={p.title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15">
                <p.icon className="h-5 w-5 text-emerald-300" />
              </div>
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-2 text-sm text-white/55">{p.body}</p>
              <Link
                href={p.href}
                className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-emerald-300 hover:underline"
              >
                {p.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </section>

        <section className="mt-24 flex flex-col items-center rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
          <Building2 className="h-8 w-8 text-emerald-300" />
          <h2 className="mt-4 text-2xl font-bold">One platform. Any brand. Minutes to live.</h2>
          <p className="mt-2 max-w-lg text-white/55">
            Entrestate provisions a complete, isolated, branded system per client. The demo is the
            product — nothing to install, nothing to migrate.
          </p>
          <Link
            href="/pitch"
            className="mt-8 rounded-full bg-emerald-400 px-8 py-3 font-semibold text-black hover:bg-emerald-300"
          >
            Start the call
          </Link>
        </section>

        <footer className="mt-20 text-center text-xs text-white/35">
          © Entrestate · entrestate.com
        </footer>
      </div>
    </main>
  );
}
