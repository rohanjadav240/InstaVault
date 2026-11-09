import type { BrowserParseResult } from './baseParser';
import {
  classifyUrl,
  extractHashtags,
  extractShortcodeFromUrl,
  extractUsernameFromUrl,
  normalizeTimestamp,
  normalizeUrl,
  normalizeUsername,
} from './baseParser';

function isLikelyUsername(str: string | null | undefined): boolean {
  if (!str) return false;
  const trimmed = str.trim().replace(/^@+/, '');
  return /^[a-zA-Z0-9_.]{1,35}$/.test(trimmed) && !trimmed.includes(' ');
}

export function parseHtmlFile(filePath: string, htmlText: string): BrowserParseResult {
  const result: BrowserParseResult = {
    category: 'unknown',
    items: [],
    errors: [],
    warnings: [],
    sourceFile: filePath,
    confidence: 0,
  };

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const lowerPath = filePath.toLowerCase();

  // 1. Collections: MUST check before generic 'saved' because file is usually saved/saved_collections.html!
  if (lowerPath.includes('collection')) {
    result.category = 'collections';
    result.confidence = 0.95;
    parseHtmlCollections(doc, filePath, result);
    return result;
  }

  // 2. Saved Media / Posts / Reels
  if (lowerPath.includes('saved')) {
    result.category = 'saved_posts';
    result.confidence = 0.9;
    parseHtmlSaved(doc, filePath, result);
    return result;
  }

  // 3. Followers
  if (lowerPath.includes('follower')) {
    result.category = 'followers';
    result.confidence = 0.9;
    parseHtmlSocialList(doc, 'follower', filePath, result);
    return result;
  }

  // 4. Following
  if (lowerPath.includes('following')) {
    result.category = 'following';
    result.confidence = 0.9;
    parseHtmlSocialList(doc, 'following', filePath, result);
    return result;
  }

  // 5. Likes
  if (lowerPath.includes('like')) {
    result.category = 'likes';
    result.confidence = 0.85;
    parseHtmlLikes(doc, filePath, result);
    return result;
  }

  // 6. Comments
  if (lowerPath.includes('comment')) {
    result.category = 'comments';
    result.confidence = 0.85;
    parseHtmlComments(doc, filePath, result);
    return result;
  }

  // 7. Messages
  if (lowerPath.includes('message') || lowerPath.includes('inbox')) {
    result.category = 'messages';
    result.confidence = 0.85;
    parseHtmlMessages(doc, filePath, result);
    return result;
  }

  // 8. Stories
  if (lowerPath.includes('stories') || lowerPath.includes('story')) {
    result.category = 'stories';
    result.confidence = 0.85;
    parseHtmlStories(doc, filePath, result);
    return result;
  }

  // Fallback: extract any instagram links from HTML
  parseGenericHtml(doc, filePath, result);
  return result;
}

/**
 * Finds the enclosing table that contains post metadata (Caption, Owner, URL).
 */
function findPostTable(a: Element): HTMLTableElement | null {
  let cur: Element | null = a.parentElement;
  while (cur && cur.tagName !== 'BODY') {
    if (cur.tagName === 'TABLE') {
      const rows = cur.querySelectorAll(':scope > tbody > tr, :scope > tr');
      for (const r of Array.from(rows)) {
        const txt = r.textContent || '';
        if (txt.includes('URL') || txt.includes('Caption')) {
          return cur as HTMLTableElement;
        }
      }
    }
    cur = cur.parentElement;
  }
  return null;
}

/**
 * Extracts caption, creator username/name, hashtags, and saved date from an Instagram table container.
 */
function extractPostDataFromTable(table: HTMLTableElement | null, rawUrl: string) {
  let caption: string | null = null;
  let username: string | null = null;
  let displayName: string | null = null;
  const hashtags: string[] = [];
  let savedAt: string | null = null;

  if (table) {
    const rows = table.querySelectorAll('tr');
    for (const r of Array.from(rows)) {
      const tds = r.querySelectorAll(':scope > td');
      if (tds.length === 2) {
        const lbl = tds[0].textContent?.trim();
        const val = tds[1].textContent?.trim();
        if (lbl === 'Caption' && val && !caption) {
          caption = val;
        } else if (lbl === 'Username' && val && !username) {
          username = normalizeUsername(val);
        } else if (lbl === 'Name' && val && !displayName) {
          displayName = val;
        } else if ((lbl === 'Time' || lbl === 'Date' || lbl === 'Saved on') && val && !savedAt) {
          savedAt = normalizeTimestamp(val);
        }
      }

      if (r.textContent?.includes('Hashtags')) {
        const htDivs = r.querySelectorAll('div._a6-p, div[class*="pam"]');
        for (const ht of Array.from(htDivs)) {
          const t = ht.textContent?.trim();
          if (t && !t.includes(' ') && !t.includes('Hashtags') && !t.includes('Name') && !hashtags.includes(t)) {
            hashtags.push(t);
          }
        }
      }
    }
  }

  // Extract hashtags from caption if missing from table
  if (caption) {
    for (const h of extractHashtags(caption)) {
      if (!hashtags.includes(h)) hashtags.push(h);
    }
  }

  // Determine best creator: prefer username, fallback to displayName if valid handle, fallback to URL
  let finalCreator: string | null = null;
  if (username) {
    finalCreator = username;
  } else if (displayName && isLikelyUsername(displayName)) {
    finalCreator = normalizeUsername(displayName);
  } else if (displayName) {
    finalCreator = displayName;
  } else {
    finalCreator = extractUsernameFromUrl(rawUrl);
  }

  return { caption, creatorUsername: finalCreator, hashtags, savedAt };
}

function parseHtmlSaved(doc: Document, filePath: string, result: BrowserParseResult) {
  const links = doc.querySelectorAll('a[href*="instagram.com"]');
  const seenUrls = new Set<string>();

  for (const a of Array.from(links)) {
    const rawUrl = a.getAttribute('href') || '';
    if (!rawUrl) continue;

    const normUrl = normalizeUrl(rawUrl);
    if (seenUrls.has(normUrl)) continue;
    seenUrls.add(normUrl);

    const postTable = findPostTable(a);
    const data = extractPostDataFromTable(postTable, rawUrl);
    const cType = classifyUrl(rawUrl);
    const shortcode = extractShortcodeFromUrl(rawUrl);

    result.items.push({
      contentType: cType,
      originalUrl: rawUrl,
      normalizedUrl: normUrl,
      shortcode,
      creatorUsername: data.creatorUsername,
      caption: data.caption,
      hashtags: data.hashtags,
      savedAt: data.savedAt,
      sourceFile: filePath,
      metadataJson: null,
      isDuplicate: false,
    });
  }
}

function parseHtmlCollections(doc: Document, filePath: string, result: BrowserParseResult) {
  const tables = doc.querySelectorAll('table');
  const collectionTables: Array<{ table: HTMLTableElement; name: string; updateTime: string | null }> = [];

  for (const table of Array.from(tables)) {
    const directRows = table.querySelectorAll(':scope > tbody > tr, :scope > tr');
    let hasPrivacy = false;
    let hasUpdateTime = false;
    let colName: string | null = null;
    let updateTime: string | null = null;

    for (const r of Array.from(directRows)) {
      const tds = r.querySelectorAll(':scope > td');
      if (tds.length === 2) {
        const k = tds[0].textContent?.trim();
        const v = tds[1].textContent?.trim();
        if (k === 'Name' && v) colName = v;
        if (k === 'Privacy') hasPrivacy = true;
        if (k === 'Update time') {
          hasUpdateTime = true;
          updateTime = v;
        }
      }
    }

    if (hasPrivacy && hasUpdateTime && colName) {
      collectionTables.push({ table: table as HTMLTableElement, name: colName, updateTime });
    }
  }

  if (collectionTables.length > 0) {
    for (const ct of collectionTables) {
      const links = ct.table.querySelectorAll('a[href*="instagram.com"]');
      const items: Array<Record<string, unknown>> = [];
      const seenUrls = new Set<string>();

      for (const a of Array.from(links)) {
        const rawUrl = a.getAttribute('href') || '';
        if (!rawUrl) continue;
        const normUrl = normalizeUrl(rawUrl);
        if (seenUrls.has(normUrl)) continue;
        seenUrls.add(normUrl);

        const postTable = findPostTable(a);
        const data = extractPostDataFromTable(postTable, rawUrl);
        const cType = classifyUrl(rawUrl);
        const shortcode = extractShortcodeFromUrl(rawUrl);

        items.push({
          contentType: cType,
          originalUrl: rawUrl,
          normalizedUrl: normUrl,
          shortcode,
          creatorUsername: data.creatorUsername,
          caption: data.caption,
          collectionName: ct.name,
          hashtags: data.hashtags,
          savedAt: data.savedAt || normalizeTimestamp(ct.updateTime),
          sourceFile: filePath,
          metadataJson: null,
          isDuplicate: false,
        });
      }

      result.items.push({
        name: ct.name,
        instagramId: null,
        itemCount: items.length,
        items,
        sourceFile: filePath,
      });
    }
    return;
  }

  // Fallback: headers grouping
  const headers = doc.querySelectorAll('h1, h2, h3, h4');
  if (headers.length > 0) {
    for (const h of Array.from(headers)) {
      const name = h.textContent?.trim() || 'Collection';
      const section = h.nextElementSibling;
      const links = section?.querySelectorAll('a[href*="instagram.com"]') || [];
      const items = Array.from(links).map((a) => {
        const href = a.getAttribute('href') || '';
        return {
          originalUrl: href,
          normalizedUrl: normalizeUrl(href),
          collectionName: name,
          savedAt: null,
        };
      });

      result.items.push({
        name,
        instagramId: null,
        itemCount: items.length,
        items,
        sourceFile: filePath,
      });
    }
  }
}

function parseHtmlSocialList(
  doc: Document,
  connectionType: 'follower' | 'following',
  filePath: string,
  result: BrowserParseResult
) {
  const links = doc.querySelectorAll('a[href*="instagram.com"]');
  for (const a of Array.from(links)) {
    const href = a.getAttribute('href') || '';
    const username = normalizeUsername(a.textContent || extractUsernameFromUrl(href));
    if (!username) continue;

    const parent = a.closest('div, li, tr') || a.parentElement;
    let timestamp: string | null = null;
    if (parent) {
      const timeElem = parent.querySelector('time');
      if (timeElem) timestamp = normalizeTimestamp(timeElem.getAttribute('datetime') || timeElem.textContent);
    }

    result.items.push({
      connectionType,
      username,
      profileUrl: href || `https://www.instagram.com/${username}/`,
      timestamp,
      sourceFile: filePath,
    });
  }
}

function parseHtmlLikes(doc: Document, filePath: string, result: BrowserParseResult) {
  const links = doc.querySelectorAll('a[href*="instagram.com"]');
  for (const a of Array.from(links)) {
    const href = a.getAttribute('href') || '';
    if (!href) continue;

    const postTable = findPostTable(a);
    const data = extractPostDataFromTable(postTable, href);

    result.items.push({
      likeType: 'post',
      targetUser: data.creatorUsername || extractUsernameFromUrl(href),
      targetUrl: href,
      timestamp: data.savedAt,
      sourceFile: filePath,
    });
  }
}

function parseHtmlComments(doc: Document, filePath: string, result: BrowserParseResult) {
  const tables = doc.querySelectorAll('table');
  if (tables.length > 0) {
    for (const table of Array.from(tables)) {
      let commentText: string | null = null;
      let mediaOwner: string | null = null;
      let commentTime: string | null = null;

      const rows = table.querySelectorAll('tr');
      for (const r of Array.from(rows)) {
        const tds = r.querySelectorAll(':scope > td');
        if (tds.length === 2) {
          const lbl = tds[0].textContent?.trim();
          const val = tds[1].textContent?.trim();
          if (lbl === 'Comment' && val) commentText = val;
          else if (lbl === 'Media Owner' && val) mediaOwner = val;
          else if (lbl === 'Time' && val) commentTime = normalizeTimestamp(val);
        }
      }

      if (commentText) {
        result.items.push({
          text: commentText,
          targetUser: mediaOwner ? normalizeUsername(mediaOwner) : null,
          targetUrl: null,
          timestamp: commentTime,
          sourceFile: filePath,
        });
      }
    }
    return;
  }

  // Fallback
  const items = doc.querySelectorAll('div, li, tr');
  for (const el of Array.from(items)) {
    const text = el.textContent?.trim();
    if (text && text.length > 5) {
      const a = el.querySelector('a[href*="instagram.com"]');
      result.items.push({
        text,
        targetUser: null,
        targetUrl: a?.getAttribute('href') || null,
        timestamp: null,
        sourceFile: filePath,
      });
    }
  }
}

function parseHtmlStories(doc: Document, filePath: string, result: BrowserParseResult) {
  const links = doc.querySelectorAll('a');
  for (const a of Array.from(links)) {
    const href = a.getAttribute('href') || '';
    result.items.push({
      mediaPath: href,
      mediaType: href.endsWith('.mp4') ? 'video' : 'photo',
      takenAt: null,
      caption: a.textContent?.trim() || null,
      sourceFile: filePath,
    });
  }
}

function parseHtmlMessages(doc: Document, filePath: string, result: BrowserParseResult) {
  const title = doc.querySelector('h1, h2, title')?.textContent?.trim() || 'Direct Message';
  const messageNodes = doc.querySelectorAll('.message, [class*="message"], [class*="chat"]');

  for (const m of Array.from(messageNodes)) {
    const content = m.textContent?.trim() || '';
    if (!content) continue;
    result.items.push({
      threadTitle: title,
      participants: [],
      senderUsername: null,
      content,
      contentType: 'text',
      timestamp: null,
      sourceFile: filePath,
      isEncrypted: false,
    });
  }
}

function parseGenericHtml(doc: Document, filePath: string, result: BrowserParseResult) {
  const links = doc.querySelectorAll('a[href*="instagram.com"]');
  if (links.length > 0) {
    result.category = 'links';
    result.confidence = 0.5;
    for (const a of Array.from(links)) {
      const rawUrl = a.getAttribute('href') || '';
      if (!rawUrl) continue;
      result.items.push({
        contentType: classifyUrl(rawUrl),
        originalUrl: rawUrl,
        normalizedUrl: normalizeUrl(rawUrl),
        shortcode: extractShortcodeFromUrl(rawUrl),
        creatorUsername: extractUsernameFromUrl(rawUrl),
        caption: a.textContent?.trim() || null,
        hashtags: [],
        savedAt: null,
        sourceFile: filePath,
        metadataJson: null,
        isDuplicate: false,
      });
    }
  }
}
