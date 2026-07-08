/**
 * POST /api/voice/tts — same-origin proxy to the kloom voice service.
 *
 * kloom (deployed on the same Vercel team) owns the tuned TTS stack
 * (ElevenLabs primary, Arabic-aware voices/prosody). We forward the agent's
 * reply text and stream back the audio, so the browser stays same-origin and
 * kloom's provider keys never touch this app. If KLOOM_VOICE_BASE_URL is
 * unset, the client falls back to the browser Web Speech API.
 */

import { checkRateLimit, requestIp, tooMany } from '@/lib/whitelabel/rate-limit';

export const maxDuration = 60;

const base = () => process.env.KLOOM_VOICE_BASE_URL?.replace(/\/$/, '') || '';

export async function POST(req: Request) {
  const target = base();
  if (!target) return Response.json({ error: 'Voice service not configured.' }, { status: 503 });

  const rl = await checkRateLimit(`tts:ip:${requestIp(req)}`, 120, 600);
  if (!rl.allowed) return tooMany(rl.retryAfterSec);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid body.' }, { status: 400 });
  }

  try {
    const res = await fetch(`${target}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.KLOOM_VOICE_TOKEN ? { Authorization: `Bearer ${process.env.KLOOM_VOICE_TOKEN}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(55_000),
    });
    if (!res.ok || !res.body) {
      return Response.json({ error: 'TTS upstream failed.' }, { status: 502 });
    }
    // Stream the audio straight through with its content type.
    return new Response(res.body, {
      status: 200,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json({ error: 'TTS unavailable.' }, { status: 503 });
  }
}
