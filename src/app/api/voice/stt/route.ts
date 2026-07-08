/**
 * POST /api/voice/stt — same-origin proxy to kloom's speech-to-text.
 *
 * Forwards a multipart audio upload (field `file`) to kloom's Groq/Whisper
 * STT (Arabic-aware) and returns { text }. Same rationale as the TTS proxy:
 * keep the browser same-origin and kloom's keys server-side.
 */

import { checkRateLimit, requestIp, tooMany } from '@/lib/whitelabel/rate-limit';

export const runtime = 'nodejs';
export const maxDuration = 60;

const base = () => process.env.KLOOM_VOICE_BASE_URL?.replace(/\/$/, '') || '';

export async function POST(req: Request) {
  const target = base();
  if (!target) return Response.json({ error: 'Voice service not configured.' }, { status: 503 });

  const rl = await checkRateLimit(`stt:ip:${requestIp(req)}`, 120, 600);
  if (!rl.allowed) return tooMany(rl.retryAfterSec);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: 'Expected multipart/form-data.' }, { status: 400 });
  }
  const file = form.get('file');
  if (!(file instanceof Blob) || file.size === 0) {
    return Response.json({ error: 'Missing audio file.' }, { status: 400 });
  }

  try {
    const upstream = new FormData();
    upstream.append('file', file, 'audio.webm');
    const lang = form.get('language');
    if (typeof lang === 'string') upstream.append('language', lang);

    const res = await fetch(`${target}/api/stt`, {
      method: 'POST',
      headers: process.env.KLOOM_VOICE_TOKEN ? { Authorization: `Bearer ${process.env.KLOOM_VOICE_TOKEN}` } : {},
      body: upstream,
      signal: AbortSignal.timeout(55_000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return Response.json({ error: data?.error || 'STT upstream failed.' }, { status: 502 });
    return Response.json({ text: typeof data?.text === 'string' ? data.text : '' });
  } catch {
    return Response.json({ error: 'STT unavailable.' }, { status: 503 });
  }
}
