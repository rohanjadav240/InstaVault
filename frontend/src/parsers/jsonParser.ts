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
  // Instagram usernames: 1-30 chars, alphanumeric + periods + underscores, no spaces
  return /^[a-zA-Z0-9_.]{1,35}$/.test(trimmed) && !trimmed.includes(' ');
}

function extractCreatorFromText(text: string | null | undefined): string | null {
  if (!text) return null;
  // Match patterns like "Saved a reel by username" or "username's post" or "from @username"
  const byMatch = text.match(/(?:by|from)\s+@?([a-zA-Z0-9_.]+)/i);
  if (byMatch && isLikelyUsername(byMatch[1])) {
    return normalizeUsername(byMatch[1]);
  }
  const possessiveMatch = text.match(/^@?([a-zA-Z0-9_.]+)(?:'s|’s)\s+(?:post|reel|photo|video)/i);
  if (possessiveMatch && isLikelyUsername(possessiveMatch[1])) {
    return normalizeUsername(possessiveMatch[1]);
  }
  if (isLikelyUsername(text)) {
    return normalizeUsername(text);
  }
  return null;
}

export function parseJsonFile(filePath: string, text: string): BrowserParseResult {
  const result: BrowserParseResult = {
    category: 'unknown',
    items: [],
    errors: [],
    warnings: [],
    sourceFile: filePath,
    confidence: 0,
  };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch (err: unknown) {
    result.errors.push(`Invalid JSON: ${(err as Error).message}`);
    return result;
  }

  const lowerPath = filePath.toLowerCase();

  // 1. Collections: MUST check before generic 'saved' because file is often saved/saved_collections.json!
  if (
    lowerPath.includes('collection') ||
    (typeof data === 'object' && data !== null && ('saved_collections' in data || 'collections' in data))
  ) {
    result.category = 'collections';
    result.confidence = 0.95;
    parseJsonCollections(data, filePath, result);
    return result;
  }

  // 2. Saved Media / Posts / Reels
  if (
    lowerPath.includes('saved') ||
    (typeof data === 'object' &&
      data !== null &&
      ('saved_saved_media' in data || 'saved_media' in data || 'saved_posts' in data || 'ig_saved_media' in data))
  ) {
    result.category = 'saved_posts';
    result.confidence = 0.9;
    parseJsonSavedMedia(data, filePath, result);
    return result;
  }

  // 3. Followers
  if (lowerPath.includes('follower')) {
    result.category = 'followers';
    result.confidence = 0.9;
    parseJsonSocialList(data, 'follower', filePath, result);
    return result;
  }

  // 4. Following
  if (lowerPath.includes('following')) {
    result.category = 'following';
    result.confidence = 0.9;
    parseJsonSocialList(data, 'following', filePath, result);
    return result;
  }

  // 5. Likes
  if (lowerPath.includes('like') || lowerPath.includes('liked_posts')) {
    result.category = 'likes';
    result.confidence = 0.85;
    parseJsonLikes(data, filePath, result);
    return result;
  }

  // 6. Comments
  if (lowerPath.includes('comment')) {
    result.category = 'comments';
    result.confidence = 0.85;
    parseJsonComments(data, filePath, result);
    return result;
  }

  // 7. Messages
  if (lowerPath.includes('message') || lowerPath.includes('inbox')) {
    result.category = 'messages';
    result.confidence = 0.9;
    parseJsonMessages(data, filePath, result);
    return result;
  }

  // 8. Stories
  if (lowerPath.includes('stories') || lowerPath.includes('story')) {
    result.category = 'stories';
    result.confidence = 0.85;
    parseJsonStories(data, filePath, result);
    return result;
  }

  // Generic heuristic fallback
  if (Array.isArray(data)) {
    result.category = 'generic_list';
    result.confidence = 0.3;
    result.items = data.slice(0, 500) as Array<Record<string, unknown>>;
  }

  return result;
}

function parseJsonSavedMedia(data: unknown, filePath: string, result: BrowserParseResult) {
  let list: unknown[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.saved_saved_media)) list = obj.saved_saved_media;
    else if (Array.isArray(obj.saved_media)) list = obj.saved_media;
    else if (Array.isArray(obj.saved_posts)) list = obj.saved_posts;
    else if (Array.isArray(obj.ig_saved_media)) list = obj.ig_saved_media;
  }

  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const entryObj = entry as Record<string, unknown>;

    const entryTitle = typeof entryObj.title === 'string' ? entryObj.title.trim() : '';

    // Check if title is a creator or a caption
    let entryCreator = extractCreatorFromText(entryTitle);
    let entryCaption: string | null = null;
    if (entryTitle && !entryCreator) {
      entryCaption = entryTitle;
    }

    const mediaList =
      (Array.isArray(entryObj.media_list_data) && entryObj.media_list_data) ||
      (Array.isArray(entryObj.string_list_data) && entryObj.string_list_data) ||
      [entryObj];

    for (const m of mediaList) {
      if (!m || typeof m !== 'object') continue;
      const mObj = m as Record<string, unknown>;
      const rawUrl =
        (mObj.href as string) ||
        (mObj.uri as string) ||
        (mObj.media_url as string) ||
        (mObj.url as string) ||
        '';

      if (!rawUrl && !mObj.creation_timestamp && !mObj.timestamp) continue;

      const normUrl = rawUrl ? normalizeUrl(rawUrl) : '';
      const cType = classifyUrl(rawUrl || filePath);
      const shortcode = rawUrl ? extractShortcodeFromUrl(rawUrl) : null;

      // Extract caption from all potential fields
      const mVal = typeof mObj.value === 'string' ? mObj.value.trim() : '';
      const mTitle = typeof mObj.title === 'string' ? mObj.title.trim() : '';
      const mCaption = typeof mObj.caption === 'string' ? mObj.caption.trim() : '';
      const mText = typeof mObj.text === 'string' ? mObj.text.trim() : '';

      // Determine best caption
      let finalCaption: string | null = null;
      if (mVal && mVal !== rawUrl) finalCaption = mVal;
      else if (mCaption) finalCaption = mCaption;
      else if (mTitle && mTitle !== rawUrl && !isLikelyUsername(mTitle)) finalCaption = mTitle;
      else if (mText) finalCaption = mText;
      else if (entryCaption) finalCaption = entryCaption;

      // Determine best creator
      let finalCreator: string | null = null;
      if (entryCreator) {
        finalCreator = entryCreator;
      } else if (mTitle && isLikelyUsername(mTitle)) {
        finalCreator = normalizeUsername(mTitle);
      } else if (mVal && isLikelyUsername(mVal)) {
        finalCreator = normalizeUsername(mVal);
      } else if (rawUrl) {
        finalCreator = extractUsernameFromUrl(rawUrl);
      }

      const timestamp = normalizeTimestamp(
        mObj.creation_timestamp || mObj.timestamp || entryObj.creation_timestamp || entryObj.timestamp
      );

      result.items.push({
        contentType: cType,
        originalUrl: rawUrl,
        normalizedUrl: normUrl,
        shortcode,
        creatorUsername: finalCreator,
        caption: finalCaption,
        hashtags: extractHashtags(finalCaption),
        savedAt: timestamp,
        sourceFile: filePath,
        metadataJson: mObj,
        isDuplicate: false,
      });
    }
  }
}

function parseJsonCollections(data: unknown, filePath: string, result: BrowserParseResult) {
  let list: unknown[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    list =
      (Array.isArray(obj.saved_collections) && obj.saved_collections) ||
      (Array.isArray(obj.collections) && obj.collections) ||
      [];
  }

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const col = item as Record<string, unknown>;
    const name = (col.title as string) || (col.name as string) || 'Saved Collection';

    let rawList: unknown[] = [];
    if (Array.isArray(col.media_list_data)) rawList = col.media_list_data;
    else if (Array.isArray(col.string_list_data)) rawList = col.string_list_data;
    else if (Array.isArray(col.media)) rawList = col.media;
    else if (Array.isArray(col.saved_collection_media)) rawList = col.saved_collection_media;
    else if (Array.isArray(col.items)) rawList = col.items;

    const parsedItems: Array<Record<string, unknown>> = [];

    for (const m of rawList) {
      if (!m) continue;

      // Case 1: m is just a URL string
      if (typeof m === 'string') {
        const rawUrl = m;
        const normUrl = normalizeUrl(rawUrl);
        parsedItems.push({
          originalUrl: rawUrl,
          normalizedUrl: normUrl,
          contentType: classifyUrl(rawUrl),
          shortcode: extractShortcodeFromUrl(rawUrl),
          creatorUsername: extractUsernameFromUrl(rawUrl),
          caption: null,
          collectionName: name,
          hashtags: [],
          savedAt: null,
          sourceFile: filePath,
          metadataJson: null,
          isDuplicate: false,
        });
        continue;
      }

      if (typeof m !== 'object') continue;
      const mObj = m as Record<string, unknown>;

      // Case 2: m is an entry containing nested string_list_data or media_list_data
      const innerList =
        (Array.isArray(mObj.string_list_data) && mObj.string_list_data) ||
        (Array.isArray(mObj.media_list_data) && mObj.media_list_data) ||
        null;

      if (innerList && innerList.length > 0) {
        const entryTitle = typeof mObj.title === 'string' ? mObj.title.trim() : '';
        const entryCreator = isLikelyUsername(entryTitle) ? normalizeUsername(entryTitle) : null;
        const entryCaption = entryTitle && !entryCreator ? entryTitle : null;

        for (const inner of innerList) {
          if (!inner || typeof inner !== 'object') continue;
          const inObj = inner as Record<string, unknown>;
          const rawUrl =
            (inObj.href as string) ||
            (inObj.uri as string) ||
            (inObj.url as string) ||
            (inObj.media_url as string) ||
            '';
          if (!rawUrl) continue;

          const normUrl = normalizeUrl(rawUrl);
          const shortcode = extractShortcodeFromUrl(rawUrl);
          const inVal = typeof inObj.value === 'string' ? inObj.value.trim() : '';
          const caption = (inVal && inVal !== rawUrl ? inVal : null) || entryCaption;
          const creator =
            entryCreator ||
            (inVal && isLikelyUsername(inVal) ? normalizeUsername(inVal) : null) ||
            extractUsernameFromUrl(rawUrl);

          parsedItems.push({
            originalUrl: rawUrl,
            normalizedUrl: normUrl,
            contentType: classifyUrl(rawUrl),
            shortcode,
            creatorUsername: creator,
            caption,
            hashtags: extractHashtags(caption),
            collectionName: name,
            savedAt: normalizeTimestamp(inObj.creation_timestamp || inObj.timestamp || mObj.timestamp),
            sourceFile: filePath,
            metadataJson: inObj,
            isDuplicate: false,
          });
        }
        continue;
      }

      // Case 3: m itself has the URL
      const rawUrl =
        (mObj.href as string) ||
        (mObj.uri as string) ||
        (mObj.url as string) ||
        (mObj.media_url as string) ||
        '';
      if (!rawUrl) continue;

      const normUrl = normalizeUrl(rawUrl);
      const shortcode = extractShortcodeFromUrl(rawUrl);
      const mVal = typeof mObj.value === 'string' ? mObj.value.trim() : '';
      const mTitle = typeof mObj.title === 'string' ? mObj.title.trim() : '';
      const mCaption = typeof mObj.caption === 'string' ? mObj.caption.trim() : '';

      let caption: string | null = null;
      if (mVal && mVal !== rawUrl) caption = mVal;
      else if (mCaption) caption = mCaption;
      else if (mTitle && mTitle !== rawUrl && !isLikelyUsername(mTitle)) caption = mTitle;

      let creator: string | null = null;
      if (mTitle && isLikelyUsername(mTitle)) creator = normalizeUsername(mTitle);
      else if (mVal && isLikelyUsername(mVal)) creator = normalizeUsername(mVal);
      else creator = extractUsernameFromUrl(rawUrl);

      parsedItems.push({
        originalUrl: rawUrl,
        normalizedUrl: normUrl,
        contentType: classifyUrl(rawUrl),
        shortcode,
        creatorUsername: creator,
        caption,
        hashtags: extractHashtags(caption),
        collectionName: name,
        savedAt: normalizeTimestamp(mObj.creation_timestamp || mObj.timestamp),
        sourceFile: filePath,
        metadataJson: mObj,
        isDuplicate: false,
      });
    }

    result.items.push({
      name,
      instagramId: (col.id as string) || null,
      itemCount: parsedItems.length,
      items: parsedItems,
      sourceFile: filePath,
    });
  }
}

function parseJsonSocialList(
  data: unknown,
  connectionType: 'follower' | 'following',
  filePath: string,
  result: BrowserParseResult
) {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    list =
      (Array.isArray(obj.relationships_following) && obj.relationships_following) ||
      (Array.isArray(obj.relationships_followers) && obj.relationships_followers) ||
      [];
  }

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const itemObj = item as Record<string, unknown>;
    const strListData = Array.isArray(itemObj.string_list_data) ? itemObj.string_list_data : [itemObj];

    for (const sub of strListData) {
      if (!sub || typeof sub !== 'object') continue;
      const subObj = sub as Record<string, unknown>;
      const username = normalizeUsername((subObj.value as string) || (itemObj.title as string) || '');
      if (!username) continue;

      result.items.push({
        connectionType,
        username,
        profileUrl: (subObj.href as string) || `https://www.instagram.com/${username}/`,
        timestamp: normalizeTimestamp(subObj.timestamp),
        sourceFile: filePath,
      });
    }
  }
}

function parseJsonLikes(data: unknown, filePath: string, result: BrowserParseResult) {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    list =
      (Array.isArray(obj.likes_media_likes) && obj.likes_media_likes) ||
      (Array.isArray(obj.likes_comment_likes) && obj.likes_comment_likes) ||
      [];
  }

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const itemObj = item as Record<string, unknown>;
    const strListData = Array.isArray(itemObj.string_list_data) ? itemObj.string_list_data : [itemObj];

    for (const sub of strListData) {
      if (!sub || typeof sub !== 'object') continue;
      const subObj = sub as Record<string, unknown>;
      const targetUrl = (subObj.href as string) || null;
      const targetUser = (itemObj.title as string) || (targetUrl ? extractUsernameFromUrl(targetUrl) : null);

      result.items.push({
        likeType: 'post',
        targetUser: normalizeUsername(targetUser),
        targetUrl,
        timestamp: normalizeTimestamp(subObj.timestamp),
        sourceFile: filePath,
      });
    }
  }
}

function parseJsonComments(data: unknown, filePath: string, result: BrowserParseResult) {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    list = (Array.isArray(obj.comments_media_comments) && obj.comments_media_comments) || [];
  }

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const itemObj = item as Record<string, unknown>;
    const strListData = Array.isArray(itemObj.string_list_data) ? itemObj.string_list_data : [itemObj];

    for (const sub of strListData) {
      if (!sub || typeof sub !== 'object') continue;
      const subObj = sub as Record<string, unknown>;
      result.items.push({
        text: (subObj.value as string) || (itemObj.title as string) || '',
        targetUser: null,
        targetUrl: (subObj.href as string) || null,
        timestamp: normalizeTimestamp(subObj.timestamp),
        sourceFile: filePath,
      });
    }
  }
}

function parseJsonMessages(data: unknown, filePath: string, result: BrowserParseResult) {
  if (typeof data !== 'object' || data === null) return;
  const obj = data as Record<string, unknown>;
  const participants = Array.isArray(obj.participants)
    ? obj.participants
        .map((p: unknown) => {
          if (typeof p === 'string') return p;
          if (typeof p === 'object' && p !== null && 'name' in p) return (p as { name: string }).name;
          return '';
        })
        .filter(Boolean)
    : [];

  const threadTitle = (obj.title as string) || participants.join(', ') || 'Direct Message';
  const messages = Array.isArray(obj.messages) ? obj.messages : [];

  for (const m of messages) {
    if (!m || typeof m !== 'object') continue;
    const mObj = m as Record<string, unknown>;
    const sender = (mObj.sender_name as string) || null;
    const content = (mObj.content as string) || '';
    const timestamp = normalizeTimestamp(mObj.timestamp_ms || mObj.timestamp);

    let contentType: 'text' | 'media' | 'link' | 'other' = 'text';
    if (mObj.photos || mObj.videos || mObj.audio_files) contentType = 'media';
    else if (mObj.share) contentType = 'link';

    result.items.push({
      threadTitle,
      participants,
      senderUsername: normalizeUsername(sender),
      content,
      contentType,
      timestamp,
      sourceFile: filePath,
      isEncrypted: false,
    });
  }
}

function parseJsonStories(data: unknown, filePath: string, result: BrowserParseResult) {
  let list: unknown[] = [];
  if (Array.isArray(data)) list = data;
  else if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    list = (Array.isArray(obj.ig_stories) && obj.ig_stories) || [];
  }

  for (const item of list) {
    if (!item || typeof item !== 'object') continue;
    const itemObj = item as Record<string, unknown>;
    result.items.push({
      mediaPath: (itemObj.uri as string) || null,
      mediaType: 'image',
      caption: (itemObj.title as string) || null,
      timestamp: normalizeTimestamp(itemObj.creation_timestamp),
      sourceFile: filePath,
    });
  }
}
