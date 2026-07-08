'use client';

/**
 * Client helper for kloom-powered voice on the white-label calls.
 *
 * Speech OUT: POST the agent's reply to /api/voice/tts (kloom → ElevenLabs,
 * Arabic-tuned) and play the returned audio. Speech IN: record a mic clip with
 * MediaRecorder and POST it to /api/voice/stt (kloom → Groq/Whisper).
 *
 * Enabled when NEXT_PUBLIC_VOICE_PROVIDER === 'kloom'; otherwise callers use
 * the browser Web Speech API. Every function fails soft so a voice hiccup
 * never breaks the call.
 */

export function kloomVoiceEnabled(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env.NEXT_PUBLIC_VOICE_PROVIDER === 'kloom'
  );
}

let currentAudio: HTMLAudioElement | null = null;

/** Speak text via kloom TTS; resolves true if audio played, false to fall back. */
export async function kloomSpeak(
  text: string,
  locale: 'en' | 'ar',
  onDone?: () => void,
): Promise<boolean> {
  try {
    stopKloomSpeaking();
    const res = await fetch('/api/voice/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: locale }),
    });
    if (!res.ok) return false;
    const blob = await res.blob();
    if (!blob.size) return false;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    currentAudio = audio;
    const finish = () => {
      URL.revokeObjectURL(url);
      if (currentAudio === audio) currentAudio = null;
      onDone?.();
    };
    audio.onended = finish;
    audio.onerror = finish;
    await audio.play();
    return true;
  } catch {
    return false;
  }
}

export function stopKloomSpeaking(): void {
  if (currentAudio) {
    try {
      currentAudio.pause();
      currentAudio.onended = null;
      currentAudio.onerror = null;
    } catch {
      /* ignore */
    }
    currentAudio = null;
  }
}

export interface KloomRecorder {
  stop: () => void;
}

/**
 * Record one utterance and transcribe it via kloom STT. Auto-stops after
 * `maxMs` (a spoken turn is short). Calls onText with the transcript, or
 * onFail so the caller can fall back to the browser recognizer.
 */
export async function kloomRecordOnce(
  locale: 'en' | 'ar',
  onText: (text: string) => void,
  onFail?: () => void,
  maxMs = 12_000,
): Promise<KloomRecorder | null> {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    onFail?.();
    return null;
  }
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    onFail?.();
    return null;
  }

  const chunks: BlobPart[] = [];
  const rec = new MediaRecorder(stream);
  let stopped = false;

  const cleanup = () => {
    stream.getTracks().forEach((t) => t.stop());
  };

  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  rec.onstop = async () => {
    cleanup();
    if (!chunks.length) {
      onFail?.();
      return;
    }
    try {
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      const form = new FormData();
      form.append('file', blob, 'audio.webm');
      form.append('language', locale);
      const res = await fetch('/api/voice/stt', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      const text = (data?.text || '').trim();
      if (text) onText(text);
      else onFail?.();
    } catch {
      onFail?.();
    }
  };

  rec.start();
  const timer = setTimeout(() => {
    if (!stopped && rec.state !== 'inactive') rec.stop();
  }, maxMs);

  return {
    stop: () => {
      stopped = true;
      clearTimeout(timer);
      if (rec.state !== 'inactive') rec.stop();
      else cleanup();
    },
  };
}
