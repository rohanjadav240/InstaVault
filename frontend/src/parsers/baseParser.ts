import type { ContentType } from '../types';

export interface BrowserParseResult {
  category: string;
  items: Array<Record<string, unknown>>;
  errors: string[];
  warnings: string[];
  sourceFile: string;
  confidence: number;
}

export function extractShortcodeFromUrl(url: string): string | null {
  const match = url.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

export function classifyUrl(url: string): ContentType {
  if (url.includes('/reel/') || url.includes('/reels/')) return 'reel';
  if (url.includes('/p/')) return 'post';
  if (url.includes('/tv/')) return 'igtv';
  if (url.includes('/stories/')) return 'story';
  if (url.includes('instagram.com/') && !url.includes('/explore/') && !url.includes('/direct/')) {
    return 'profile';
  }
  return 'unknown';
}

export function extractUsernameFromUrl(url: string): string | null {
  const match = url.match(/instagram\.com\/([A-Za-z0-9_.]+)/);
  if (match) {
    const candidate = match[1];
    if (!['p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts', 'direct'].includes(candidate)) {
      return candidate.toLowerCase();
    }
  }
  return null;
}

export function normalizeUrl(url: string): string {
  let cleaned = url.trim();
  if (cleaned.startsWith('//')) {
    cleaned = 'https:' + cleaned;
  }
  cleaned = cleaned.split('?')[0].replace(/\/+$/, '');
  return cleaned;
}

export function extractHashtags(text: string | null | undefined): string[] {
  if (!text) return [];
  const matches = text.match(/#([A-Za-z0-9_\u0080-\uFFFF]+)/g);
  if (!matches) return [];
  return Array.from(new Set(matches.map((tag) => tag.substring(1).toLowerCase())));
}

export function normalizeUsername(username: string | null | undefined): string | null {
  if (!username) return null;
  return username.replace(/^@+/, '').trim().toLowerCase();
}

export function normalizeTimestamp(raw: unknown): string | null {
  if (!raw) return null;
  try {
    if (typeof raw === 'number') {
      // Check if seconds or ms
      const ms = raw > 1e11 ? raw : raw * 1000;
      return new Date(ms).toISOString();
    }
    if (typeof raw === 'string') {
      const num = Number(raw);
      if (!isNaN(num) && num > 1e8) {
        const ms = num > 1e11 ? num : num * 1000;
        return new Date(ms).toISOString();
      }
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }
  } catch {
    return null;
  }
  return null;
}

