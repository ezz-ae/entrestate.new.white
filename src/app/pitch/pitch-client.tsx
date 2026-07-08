'use client';

/**
 * The /pitch AI-call landing experience.
 *
 * Instagram ad → this page → one tap starts an in-browser conversation with
 * the Entrestate seller agent (voice via the Web Speech API where available,
 * text everywhere). Mid-call the agent triggers provisioning; this page then
 * MORPHS into the prospect's own branded system and the agent closes to
 * "claim it". `?lang=ar` starts the call in Arabic.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Building2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mic,
  MicOff,
  MessageSquare,
  Phone,
  Send,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Tenant } from '@/types';

type Locale = 'en' | 'ar';
type Msg = { role: 'agent' | 'prospect'; text: string };
type AgentAction = 'none' | 'provision' | 'reveal' | 'close';

interface AgentState {
  companyName?: string;
  websiteUrl?: string;
  provisioning?: boolean;
  tenantSlug?: string;
  provisionFailed?: boolean;
}

interface AgentOutput {
  reply: string;
  action: AgentAction;
  companyName?: string;
  websiteUrl?: string;
}

const COPY: Record<Locale, Record<string, string>> = {
  en: {
    kicker: 'Entrestate White-Label OS',
    heroA: 'Your entire brokerage.',
    heroB: 'Your brand. Built on this call.',
    heroSub:
      'Talk to our AI for three minutes and watch your own system appear — your logo, your colors, your listings, your AI answering buyers.',
    start: 'Talk to it',
    micHint: 'Uses your microphone. You can also just type.',
    typePlaceholder: 'Type your reply…',
    listening: 'Listening…',
    building: 'Building your system',
    step1: 'Reading your brand',
    step2: 'Designing your theme',
    step3: 'Importing listings',
    step4: 'Publishing your system',
    liveBadge: 'LIVE — your demo system',
    open: 'Open your system',
    claim: 'Claim it now',
    expiry: 'Live for 7 days. Claiming keeps everything.',
    modules: 'Included in your system',
    mCrm: 'CRM & Leads',
    mSite: 'Branded Website',
    mWa: 'WhatsApp Automation',
    mAi: 'AI Sales Agent',
    mMarket: 'Market Intelligence',
    mAds: 'Ads Studio',
    yourListings: 'Your listings',
    fromYourSite: 'from your site',
    demoSeed: 'demo',
  },
  ar: {
    kicker: 'نظام إنترستيت للعلامة البيضاء',
    heroA: 'شركتك العقارية بالكامل.',
    heroB: 'بعلامتك التجارية. يُبنى خلال هذه المكالمة.',
    heroSub:
      'تحدث مع الذكاء الاصطناعي لثلاث دقائق وشاهد نظامك الخاص يظهر أمامك — شعارك وألوانك وعقاراتك، وذكاء اصطناعي يرد على عملائك.',
    start: 'تحدث معه',
    micHint: 'يستخدم المايكروفون، ويمكنك الكتابة أيضًا.',
    typePlaceholder: 'اكتب ردك…',
    listening: 'أستمع إليك…',
    building: 'جارٍ بناء نظامك',
    step1: 'قراءة هويتك التجارية',
    step2: 'تصميم الثيم الخاص بك',
    step3: 'استيراد العقارات',
    step4: 'نشر نظامك',
    liveBadge: 'مباشر — نظامك التجريبي',
    open: 'افتح نظامك',
    claim: 'احجزه الآن',
    expiry: 'متاح لمدة ٧ أيام. عند الحجز يبقى كل شيء.',
    modules: 'ماذا يشمل نظامك',
    mCrm: 'إدارة العملاء',
    mSite: 'موقع بعلامتك',
    mWa: 'أتمتة واتساب',
    mAi: 'وكيل مبيعات ذكي',
    mMarket: 'ذكاء السوق',
    mAds: 'استوديو الإعلانات',
    yourListings: 'عقاراتك',
    fromYourSite: 'من موقعك',
    demoSeed: 'تجريبي',
  },
};

const PROVISION_STEP_MS = 2600;

function pickVoice(locale: Locale): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis?.getVoices() ?? [];
  const want = locale === 'ar' ? 'ar' : 'en';
  return voices.find((v) => v.lang.toLowerCase().startsWith(want)) ?? null;
}

export default function PitchClient() {
  const [locale, setLocale] = useState<Locale>('en');
  const [phase, setPhase] = useState<'idle' | 'call'>('idle');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [agentState, setAgentState] = useState<AgentState>({});
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [input, setInput] = useState('');
  const [provisionStep, setProvisionStep] = useState(-1);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [logoBroken, setLogoBroken] = useState(false);

  const recognitionRef = useRef<any>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<AgentState>({});
  const messagesRef = useRef<Msg[]>([]);
  stateRef.current = agentState;
  messagesRef.current = messages;

  const t = COPY[locale];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const revealed = !!tenant;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('lang') === 'ar') setLocale('ar');
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SR);
    // Some browsers load the voice list asynchronously.
    window.speechSynthesis?.getVoices();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, thinking]);

  // Detach the active utterance's handlers before cancelling so an intentional
  // cancel never fires onend -> startListening (mic opening over the next reply).
  const stopSpeaking = useCallback(() => {
    if (utterRef.current) {
      utterRef.current.onend = null;
      utterRef.current.onerror = null;
      utterRef.current = null;
    }
    window.speechSynthesis?.cancel();
  }, []);

  const speak = useCallback(
    (text: string, onDone?: () => void) => {
      if (!voiceOn || !window.speechSynthesis) {
        onDone?.();
        return;
      }
      stopSpeaking();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = locale === 'ar' ? 'ar-SA' : 'en-US';
      const voice = pickVoice(locale);
      if (voice) utter.voice = voice;
      utter.rate = 1.02;
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
    [voiceOn, locale, stopSpeaking],
  );

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR || !voiceOn) return;
    try {
      recognitionRef.current?.abort?.();
      const rec = new SR();
      rec.lang = locale === 'ar' ? 'ar-SA' : 'en-US';
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        const text = e.results?.[0]?.[0]?.transcript?.trim();
        setListening(false);
        if (text) void prospectSays(text);
      };
      rec.onerror = () => setListening(false);
      rec.onend = () => setListening(false);
      recognitionRef.current = rec;
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [locale, voiceOn]); // eslint-disable-line react-hooks/exhaustive-deps

  /** One agent turn: send transcript + state, speak the reply, run the action. */
  const agentTurn = useCallback(
    async (history: Msg[], state: AgentState) => {
      setThinking(true);
      try {
        const res = await fetch('/api/whitelabel/agent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ locale, history, state }),
        });
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || 'agent failed');
        const out = json.data as AgentOutput;

        const nextState: AgentState = { ...state };
        if (out.companyName) nextState.companyName = out.companyName;
        if (out.websiteUrl) nextState.websiteUrl = out.websiteUrl;

        const nextHistory: Msg[] = [...history, { role: 'agent', text: out.reply }];
        setMessages(nextHistory);
        setThinking(false);

        const shouldProvision =
          out.action === 'provision' &&
          !nextState.provisioning &&
          !nextState.tenantSlug &&
          !!nextState.companyName;
        if (shouldProvision) {
          nextState.provisioning = true;
          nextState.provisionFailed = false;
          void provision(nextState, nextHistory);
        }
        setAgentState(nextState);

        speak(out.reply, () => {
          // Hand the mic back unless the call is over.
          if (out.action !== 'close') startListening();
        });
      } catch {
        setThinking(false);
      }
    },
    [locale, speak, startListening], // eslint-disable-line react-hooks/exhaustive-deps
  );

  /** Build the prospect's tenant, then trigger the reveal turn. */
  const provision = useCallback(
    async (state: AgentState, history: Msg[]) => {
      setProvisionStep(0);
      const stepper = setInterval(
        () => setProvisionStep((s) => (s < 3 ? s + 1 : s)),
        PROVISION_STEP_MS,
      );
      try {
        const res = await fetch('/api/whitelabel/provision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            companyName: state.companyName,
            websiteUrl: state.websiteUrl,
            locale,
          }),
        });
        const json = await res.json();
        if (!json?.ok) throw new Error(json?.error || 'provision failed');
        const live = json.data.tenant as Tenant;
        clearInterval(stepper);
        setProvisionStep(3);
        setTenant(live);
        const revealedState: AgentState = {
          ...stateRef.current,
          provisioning: false,
          tenantSlug: live.slug,
        };
        setAgentState(revealedState);
        // No new prospect input — ask the agent for its reveal turn.
        setTimeout(() => void agentTurn(messagesRef.current, revealedState), 800);
      } catch {
        clearInterval(stepper);
        setProvisionStep(-1);
        const failedState: AgentState = {
          ...stateRef.current,
          provisioning: false,
          provisionFailed: true,
        };
        setAgentState(failedState);
        void agentTurn(messagesRef.current, failedState);
      }
    },
    [locale, agentTurn],
  );

  const prospectSays = useCallback(
    async (text: string) => {
      stopSpeaking();
      const history: Msg[] = [...messagesRef.current, { role: 'prospect', text }];
      setMessages(history);
      await agentTurn(history, stateRef.current);
    },
    [agentTurn, stopSpeaking],
  );

  const startCall = useCallback(() => {
    setPhase('call');
    void agentTurn([], {});
  }, [agentTurn]);

  const submitText = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    void prospectSays(text);
  };

  const brand = tenant?.brand;
  const brandVars = useMemo(
    () =>
      brand
        ? ({
            '--pitch-primary': brand.colors.primary,
            '--pitch-accent': brand.colors.accent,
          } as React.CSSProperties)
        : undefined,
    [brand],
  );

  const monogram = (brand?.companyName || '?')
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const provisioningVisible = agentState.provisioning && !revealed;
  const steps = [t.step1, t.step2, t.step3, t.step4];

  return (
    <div
      dir={dir}
      style={brandVars}
      className="min-h-screen bg-[#07090d] text-white transition-colors duration-1000"
    >
      {/* ambient brand glow once revealed */}
      <div
        className="pointer-events-none fixed inset-0 transition-opacity duration-1000"
        style={{
          opacity: revealed ? 1 : 0,
          background:
            'radial-gradient(60% 40% at 50% 0%, color-mix(in srgb, var(--pitch-primary, #10b981) 22%, transparent), transparent 70%)',
        }}
      />

      <div className="relative mx-auto flex min-h-screen max-w-3xl flex-col px-4 pb-6 pt-6">
        {/* top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold tracking-wide text-white/80">
            <Sparkles className="h-4 w-4" />
            {revealed && brand ? brand.companyName : 'Entrestate'}
          </div>
          <div className="flex items-center gap-2">
            {revealed && (
              <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-300">
                {t.liveBadge}
              </span>
            )}
            <button
              onClick={() => setLocale((l) => (l === 'en' ? 'ar' : 'en'))}
              className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
            >
              {locale === 'en' ? 'العربية' : 'English'}
            </button>
          </div>
        </div>

        {/* ── IDLE HERO ─────────────────────────────────────────────── */}
        {phase === 'idle' && (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
              {t.kicker}
            </p>
            <h1 className="max-w-xl text-4xl font-bold leading-tight sm:text-5xl">
              {t.heroA}
              <span className="block bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
                {t.heroB}
              </span>
            </h1>
            <p className="mt-5 max-w-md text-base text-white/60">{t.heroSub}</p>
            <Button
              onClick={startCall}
              size="lg"
              className="mt-10 h-14 rounded-full bg-emerald-400 px-10 text-base font-semibold text-black hover:bg-emerald-300"
            >
              <Phone className="me-2 h-5 w-5" />
              {t.start}
            </Button>
            <p className="mt-3 text-xs text-white/40">{t.micHint}</p>
          </div>
        )}

        {/* ── REVEALED SYSTEM PREVIEW ───────────────────────────────── */}
        {revealed && brand && tenant && (
          <div className="mt-6 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur">
            <div
              className="flex items-center gap-4 border-b border-white/10 p-5"
              style={{
                background:
                  'linear-gradient(90deg, color-mix(in srgb, var(--pitch-primary) 30%, transparent), transparent)',
              }}
            >
              {brand.logoUrl && !logoBroken ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logoUrl}
                  alt={brand.companyName}
                  onError={() => setLogoBroken(true)}
                  className="h-12 w-12 rounded-xl bg-white/90 object-contain p-1"
                />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-black"
                  style={{ background: 'var(--pitch-primary)' }}
                >
                  {monogram}
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{brand.companyName}</p>
                {brand.tagline && <p className="truncate text-sm text-white/55">{brand.tagline}</p>}
              </div>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                  {t.modules}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[t.mSite, t.mCrm, t.mWa, t.mAi, t.mMarket, t.mAds].map((m) => (
                    <span
                      key={m}
                      className="rounded-full border px-3 py-1 text-xs"
                      style={{
                        borderColor: 'color-mix(in srgb, var(--pitch-primary) 45%, transparent)',
                        background: 'color-mix(in srgb, var(--pitch-primary) 12%, transparent)',
                      }}
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">
                  {t.yourListings}
                </p>
                <div className="space-y-2">
                  {tenant.listings.slice(0, 3).map((l) => (
                    <div
                      key={l.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-white/40" />
                        <div className="min-w-0">
                          <p className="truncate text-sm">{l.title}</p>
                          <p className="truncate text-xs text-white/45">
                            {l.area}
                            {l.bedrooms ? ` · ${l.bedrooms}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="ms-2 shrink-0 text-end">
                        {l.price && <p className="text-sm font-medium">{l.price}</p>}
                        <p className="text-[10px] uppercase tracking-wide text-white/35">
                          {l.fromProspect ? t.fromYourSite : t.demoSeed}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 p-5 sm:flex-row sm:items-center">
              <Button
                asChild
                className="h-11 rounded-full px-6 font-semibold text-black"
                style={{ background: 'var(--pitch-primary)' }}
              >
                <a href={`/demo/${tenant.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink className="me-2 h-4 w-4" />
                  {t.open}
                </a>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full border-white/25 px-6 text-white hover:bg-white/10"
              >
                <a href={`/pricing?claim=${tenant.slug}`}>{t.claim}</a>
              </Button>
              <p className="text-xs text-white/45 sm:ms-auto">{t.expiry}</p>
            </div>
          </div>
        )}

        {/* ── PROVISIONING CHECKLIST ────────────────────────────────── */}
        {provisioningVisible && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
              {t.building}
              {agentState.companyName ? ` — ${agentState.companyName}` : ''}
            </p>
            <div className="space-y-2">
              {steps.map((label, i) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  {provisionStep > i ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  ) : provisionStep === i ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white/60" />
                  ) : (
                    <span className="inline-block h-4 w-4 rounded-full border border-white/20" />
                  )}
                  <span className={provisionStep >= i ? 'text-white/85' : 'text-white/35'}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CONVERSATION ──────────────────────────────────────────── */}
        {phase === 'call' && (
          <div className="mt-6 flex min-h-0 flex-1 flex-col">
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto pb-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'agent' ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      m.role === 'agent'
                        ? 'border border-white/10 bg-white/[0.06] text-white/90'
                        : 'bg-emerald-400/90 text-black'
                    }`}
                  >
                    {m.role === 'agent' && (
                      <Bot className="mb-1 h-3.5 w-3.5 text-emerald-300" />
                    )}
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

            <form onSubmit={submitText} className="mt-2 flex items-center gap-2">
              {voiceSupported && (
                <button
                  type="button"
                  onClick={() => {
                    if (listening) {
                      recognitionRef.current?.abort?.();
                      setListening(false);
                    } else if (voiceOn) {
                      startListening();
                    } else {
                      setVoiceOn(true);
                    }
                  }}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition ${
                    listening
                      ? 'animate-pulse border-emerald-300 bg-emerald-400/20 text-emerald-300'
                      : 'border-white/15 text-white/70 hover:bg-white/10'
                  }`}
                  title={listening ? t.listening : 'Mic'}
                >
                  {voiceOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                </button>
              )}
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={listening ? t.listening : t.typePlaceholder}
                className="h-11 rounded-full border-white/15 bg-white/[0.06] text-white placeholder:text-white/35"
              />
              <Button
                type="submit"
                disabled={thinking || !input.trim()}
                className="h-11 w-11 shrink-0 rounded-full bg-emerald-400 p-0 text-black hover:bg-emerald-300"
              >
                {voiceSupported ? <Send className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
