'use client';

/**
 * Buyer-facing canvas + in-page AI voice call for one listing.
 *
 * The agent's `focus` steers the canvas: whichever section it is talking
 * about lights up and scrolls into view — "canvas on the spot". Voice uses
 * the Web Speech API where available, with a seamless text fallback.
 * Lead capture happens server-side in the agent API; the client only
 * reflects the captured state.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Banknote,
  Bot,
  Building2,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MapPin,
  Mic,
  Phone,
  PhoneCall,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { kloomVoiceEnabled, kloomSpeak, stopKloomSpeaking } from '@/lib/kloom-voice';
import type { VoicePage } from '@/types';

type Msg = { role: 'agent' | 'buyer'; text: string };
type Focus = 'overview' | 'price' | 'payment' | 'location' | 'contact';

const COPY = {
  en: {
    talk: 'Talk to us about this property',
    talkHint: 'Live AI advisor — voice or text, instantly.',
    start: 'Start the call',
    type: 'Type your question…',
    listening: 'Listening…',
    captured: 'Thank you — our team will contact you shortly.',
    price: 'Price',
    payment: 'Payment plan',
    location: 'Location',
    handover: 'Handover',
    highlights: 'Highlights',
    contactTitle: 'Talk to a human',
  },
  ar: {
    talk: 'تحدث معنا عن هذا العقار',
    talkHint: 'مستشار ذكي مباشر — صوت أو كتابة، فورًا.',
    start: 'ابدأ المكالمة',
    type: 'اكتب سؤالك…',
    listening: 'أستمع إليك…',
    captured: 'شكرًا لك — سيتواصل معك فريقنا قريبًا.',
    price: 'السعر',
    payment: 'خطة الدفع',
    location: 'الموقع',
    handover: 'التسليم',
    highlights: 'المميزات',
    contactTitle: 'تحدث مع فريقنا',
  },
};

export default function VoicePageClient({ page }: { page: VoicePage }) {
  const locale = page.locale;
  const t = COPY[locale];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [input, setInput] = useState('');
  const [focus, setFocus] = useState<Focus>('overview');
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [logoBroken, setLogoBroken] = useState(false);

  const recognitionRef = useRef<any>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<Msg[]>([]);
  const capturedRef = useRef(false);
  const thinkingRef = useRef(false);
  messagesRef.current = messages;
  capturedRef.current = leadCaptured;
  thinkingRef.current = thinking;

  const vars = {
    '--vp-primary': page.brand.colors.primary,
    '--vp-accent': page.brand.colors.accent,
  } as React.CSSProperties;

  const track = useCallback(
    (event: 'view' | 'call') => {
      // best-effort beacon; failures must never affect the visitor
      fetch('/api/voice-pages/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: page.slug, event }),
        keepalive: true,
      }).catch(() => {});
    },
    [page.slug],
  );

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
    window.speechSynthesis?.getVoices();
    track('view');
  }, [track]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  useEffect(() => {
    if (!started) return;
    document.getElementById(`vp-${focus}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focus, started]);

  // Detach the active utterance's handlers before cancelling, so an
  // intentional cancel never fires onend -> startListening (which would open
  // the mic while the next reply speaks and make the agent hear itself).
  const stopSpeaking = useCallback(() => {
    if (utterRef.current) {
      utterRef.current.onend = null;
      utterRef.current.onerror = null;
      utterRef.current = null;
    }
    window.speechSynthesis?.cancel();
    stopKloomSpeaking();
  }, []);

  const browserSpeak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!window.speechSynthesis) return onDone?.();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = locale === 'ar' ? 'ar-SA' : 'en-US';
      const voice = (window.speechSynthesis.getVoices() || []).find((v) =>
        v.lang.toLowerCase().startsWith(locale === 'ar' ? 'ar' : 'en'),
      );
      if (voice) utter.voice = voice;
      let done = false;
      const finish = () => {
        if (done) return;
        done = true;
        onDone?.();
      };
      utter.onend = finish;
      utter.onerror = finish;
      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
    },
    [locale],
  );

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      stopSpeaking();
      // Prefer kloom's ElevenLabs (Arabic-tuned) voice; fall back to the
      // browser synth if it's disabled or the request fails.
      if (kloomVoiceEnabled()) {
        void kloomSpeak(text, locale, onDone).then((ok) => {
          if (!ok) browserSpeak(text, onDone);
        });
        return;
      }
      browserSpeak(text, onDone);
    },
    [locale, stopSpeaking, browserSpeak],
  );

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    try {
      recognitionRef.current?.abort?.();
      const rec = new SR();
      rec.lang = locale === 'ar' ? 'ar-SA' : 'en-US';
      rec.interimResults = false;
      rec.onresult = (e: any) => {
        const text = e.results?.[0]?.[0]?.transcript?.trim();
        setListening(false);
        // Ignore input captured while a turn is already in flight, so two
        // concurrent agentTurns can't overwrite each other's message list.
        if (text && !thinkingRef.current) void buyerSays(text);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const agentTurn = useCallback(
    async (history: Msg[]) => {
      setThinking(true);
      try {
        const res = await fetch('/api/voice-pages/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: page.slug,
            locale,
            history,
            state: { leadCaptured: capturedRef.current },
          }),
        });
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || 'agent failed');
        const out = json.data as { reply: string; action: string; focus?: Focus; leadCaptured: boolean };

        setMessages([...history, { role: 'agent', text: out.reply }]);
        if (out.focus) setFocus(out.focus);
        if (out.leadCaptured) setLeadCaptured(true);
        setThinking(false);
        speak(out.reply, () => {
          if (out.action !== 'close') startListening();
        });
      } catch {
        setThinking(false);
      }
    },
    [page.slug, locale, speak, startListening],
  );

  const buyerSays = useCallback(
    async (text: string) => {
      stopSpeaking();
      const history: Msg[] = [...messagesRef.current, { role: 'buyer', text }];
      setMessages(history);
      await agentTurn(history);
    },
    [agentTurn, stopSpeaking],
  );

  // Stop the mic and TTS on unmount so nothing keeps running after navigation.
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort?.();
      stopSpeaking();
    };
  }, [stopSpeaking]);

  const startCall = () => {
    setStarted(true);
    track('call');
    void agentTurn([]);
  };

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    void buyerSays(text);
  };

  const section = (id: Focus) =>
    `rounded-2xl border p-5 transition-all duration-500 ${
      focus === id && started
        ? 'border-[var(--vp-primary)] bg-white/[0.07] shadow-[0_0_40px_-12px_var(--vp-primary)]'
        : 'border-white/10 bg-white/[0.04]'
    }`;

  const monogram = page.brand.companyName
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
            'radial-gradient(55% 35% at 50% 0%, color-mix(in srgb, var(--vp-primary) 22%, transparent), transparent 70%)',
        }}
      />
      <div className="relative mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-8 lg:grid-cols-[1fr_400px]">
        {/* ── CANVAS ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            {page.brand.logoUrl && !logoBroken ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.brand.logoUrl}
                alt={page.brand.companyName}
                onError={() => setLogoBroken(true)}
                className="h-11 w-11 rounded-xl bg-white/90 object-contain p-1"
              />
            ) : (
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl font-bold text-black"
                style={{ background: 'var(--vp-primary)' }}
              >
                {monogram}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{page.brand.companyName}</p>
              {page.brand.tagline && (
                <p className="truncate text-xs text-white/50">{page.brand.tagline}</p>
              )}
            </div>
          </div>

          <div id="vp-overview" className={section('overview')}>
            <div
              className="mb-4 flex h-44 items-center justify-center rounded-xl"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--vp-primary) 40%, #0b0e14), color-mix(in srgb, var(--vp-accent) 28%, #0b0e14))',
              }}
            >
              <Building2 className="h-12 w-12 text-white/70" />
            </div>
            <h1 className="text-2xl font-bold">{page.listing.title}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-white/60">
              <MapPin className="h-4 w-4" />
              {page.listing.area}
              {page.listing.city ? `, ${page.listing.city}` : ''}
              {page.listing.bedrooms ? ` · ${page.listing.bedrooms}` : ''}
            </p>
            {page.listing.description && (
              <p className="mt-3 text-sm leading-relaxed text-white/70">{page.listing.description}</p>
            )}
            {!!page.listing.highlights?.length && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                  {t.highlights}
                </p>
                <div className="flex flex-wrap gap-2">
                  {page.listing.highlights.map((h) => (
                    <span
                      key={h}
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--vp-primary) 45%, transparent)',
                        background: 'color-mix(in srgb, var(--vp-primary) 12%, transparent)',
                      }}
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {page.listing.price && (
              <div id="vp-price" className={section('price')}>
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                  <Banknote className="h-4 w-4" /> {t.price}
                </p>
                <p className="mt-2 text-2xl font-bold" style={{ color: 'var(--vp-primary)' }}>
                  {page.listing.price}
                </p>
                {page.listing.handover && (
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-white/60">
                    <CalendarClock className="h-4 w-4" /> {t.handover}: {page.listing.handover}
                  </p>
                )}
              </div>
            )}
            {page.listing.paymentPlan && (
              <div id="vp-payment" className={section('payment')}>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/40">
                  {t.payment}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-white/80">{page.listing.paymentPlan}</p>
              </div>
            )}
          </div>

          <div id="vp-location" className={section('location')}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              <MapPin className="h-4 w-4" /> {t.location}
            </p>
            <p className="mt-2 text-sm text-white/80">
              {page.listing.area}
              {page.listing.city ? `, ${page.listing.city}` : ''}
            </p>
          </div>

          <div id="vp-contact" className={section('contact')}>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-white/40">
              <Phone className="h-4 w-4" /> {t.contactTitle}
            </p>
            {leadCaptured ? (
              <p className="mt-2 flex items-center gap-2 text-sm text-emerald-300">
                <CheckCircle2 className="h-4 w-4" /> {t.captured}
              </p>
            ) : (
              <p className="mt-2 text-sm text-white/60">
                {page.brand.contact?.phone || page.brand.companyName}
              </p>
            )}
          </div>
        </div>

        {/* ── CALL DOCK ──────────────────────────────────────────────── */}
        <div className="lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)]">
          <div className="flex h-full min-h-[420px] flex-col rounded-3xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
            {!started ? (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full"
                  style={{ background: 'color-mix(in srgb, var(--vp-primary) 20%, transparent)' }}
                >
                  <Bot className="h-8 w-8" style={{ color: 'var(--vp-primary)' }} />
                </div>
                <p className="mt-4 font-semibold">{t.talk}</p>
                <p className="mt-1 text-sm text-white/50">{t.talkHint}</p>
                <Button
                  onClick={startCall}
                  className="mt-6 h-12 rounded-full px-8 font-semibold text-black"
                  style={{ background: 'var(--vp-primary)' }}
                >
                  <PhoneCall className="me-2 h-4 w-4" />
                  {t.start}
                </Button>
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-3">
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                          m.role === 'agent'
                            ? 'border border-white/10 bg-white/[0.06] text-white/90'
                            : 'text-black'
                        }`}
                        style={m.role === 'buyer' ? { background: 'var(--vp-primary)' } : undefined}
                      >
                        {m.text}
                      </div>
                    </div>
                  ))}
                  {thinking && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3">
                        <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                      </div>
                    </div>
                  )}
                </div>
                <form onSubmit={submitText} className="flex items-center gap-2">
                  {voiceSupported && (
                    <button
                      type="button"
                      onClick={() => {
                        if (listening) {
                          recognitionRef.current?.abort?.();
                          setListening(false);
                        } else {
                          startListening();
                        }
                      }}
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
                        listening
                          ? 'animate-pulse border-[var(--vp-primary)] text-[var(--vp-primary)]'
                          : 'border-white/15 text-white/70 hover:bg-white/10'
                      }`}
                    >
                      <Mic className="h-5 w-5" />
                    </button>
                  )}
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={listening ? t.listening : t.type}
                    className="h-11 rounded-full border-white/15 bg-white/[0.06] text-white placeholder:text-white/35"
                  />
                  <Button
                    type="submit"
                    disabled={thinking || !input.trim()}
                    className="h-11 w-11 shrink-0 rounded-full p-0 text-black"
                    style={{ background: 'var(--vp-primary)' }}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="relative pb-6 text-center text-xs text-white/30">
        <Sparkles className="mb-0.5 me-1 inline h-3 w-3" />
        Powered by Entrestate
      </p>
    </div>
  );
}
