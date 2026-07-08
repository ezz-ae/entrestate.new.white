/**
 * Lightweight brand scraper for the /pitch provisioning funnel.
 * Fetches the prospect's public site and reduces it to the signals the
 * brand-extraction flow needs: visible text, meta/OG tags, logo candidates,
 * and any hex colors found inline. No headless browser — this must run
 * fast inside a serverless request.
 */

export interface ScrapedSite {
  url: string;
  title?: string;
  description?: string;
  /** Candidate logo/OG image URLs, absolute, best-first. */
  imageCandidates: string[];
  /** Hex colors seen in the page source, most frequent first. */
  colorCandidates: string[];
  /** Visible text, whitespace-collapsed, capped. */
  text: string;
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_TEXT_CHARS = 12000;

function absolutize(src: string, base: string): string | null {
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

export function normalizeSiteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const url = new URL(withProto);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    // Only public hosts — refuse localhost/IPs to avoid SSRF into infra.
    const host = url.hostname;
    if (
      host === 'localhost' ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      !host.includes('.')
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export async function scrapeSite(rawUrl: string): Promise<ScrapedSite | null> {
  const url = normalizeSiteUrl(rawUrl);
  if (!url) return null;

  let html: string;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'EntrestateBot/1.0 (+https://entrestate.com)' },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    html = (await res.text()).slice(0, 800_000);
  } catch {
    return null;
  }

  const meta = (name: string): string | undefined => {
    const re = new RegExp(
      `<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`,
      'i',
    );
    return re.exec(html)?.[1];
  };

  const title = /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() || meta('og:site_name');
  const description = meta('description') || meta('og:description');

  const imageCandidates: string[] = [];
  const push = (src?: string | null) => {
    if (!src) return;
    const abs = absolutize(src, url);
    if (abs && !imageCandidates.includes(abs)) imageCandidates.push(abs);
  };
  // Logo-ish <img> tags first, then OG image, then icons.
  for (const m of html.matchAll(/<img[^>]+src=["']([^"']+)["'][^>]*>/gi)) {
    const tag = m[0].toLowerCase();
    if (tag.includes('logo')) push(m[1]);
  }
  push(meta('og:image'));
  for (const m of html.matchAll(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/gi)) {
    push(m[1]);
  }

  const colorCounts = new Map<string, number>();
  for (const m of html.matchAll(/#([0-9a-f]{6})\b/gi)) {
    const hex = `#${m[1].toLowerCase()}`;
    // Skip pure black/white/greys — they're never the brand color.
    if (/^#(?:([0-9a-f])\1{5}|f{6}|0{6})$/.test(hex)) continue;
    colorCounts.set(hex, (colorCounts.get(hex) ?? 0) + 1);
  }
  const colorCandidates = [...colorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([hex]) => hex);

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(nbsp|amp|quot|#39|lt|gt);/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT_CHARS);

  return { url, title, description, imageCandidates: imageCandidates.slice(0, 6), colorCandidates, text };
}
