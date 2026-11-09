import { db } from '../db/database';
import { parseArchiveFile } from '../parsers/parserRegistry';
import { scanZipArchive } from './archiveService';
import type {
  Backup,
  Collection,
  Comment,
  ContentItem,
  Creator,
  Like,
  Message,
  ProcessingProgress,
  ProcessingStage,
  SocialConnection,
  Story,
} from '../types';

export class LocalProcessingService {
  private isCancelled = false;

  public cancel() {
    this.isCancelled = true;
  }

  public async processZipFile(
    file: File,
    onProgress: (progress: ProcessingProgress) => void
  ): Promise<Backup> {
    this.isCancelled = false;
    let extractedRecordsCount = 0;
    let errorsCount = 0;
    let warningsCount = 0;

    const emit = (
      stage: ProcessingStage,
      percentage: number,
      message: string,
      currentFile: string | null = null,
      totalFiles = 0,
      processedFiles = 0
    ) => {
      onProgress({
        stage,
        percentage,
        currentFile,
        totalFiles,
        processedFiles,
        extractedRecords: extractedRecordsCount,
        errors: errorsCount,
        warnings: warningsCount,
        message,
      });
    };

    // 1. Stage: validating
    emit('validating', 5, 'Validating ZIP structure and file integrity...');
    if (!file.name.toLowerCase().endsWith('.zip')) {
      throw new Error('Selected file must be a .zip file.');
    }

    // 2. Stage: extracting & discovering
    emit('extracting', 12, 'Scanning archive files safely...');
    const { scan } = await scanZipArchive(file, (percent, curr) => {
      emit('extracting', Math.min(25, 12 + percent * 0.13), `Reading archive: ${curr}`);
    });

    if (this.isCancelled) throw new Error('Processing cancelled by user.');

    // 3. Stage: discovering
    emit('discovering', 25, `Discovered ${scan.totalFiles} files in archive.`, null, scan.totalFiles, 0);

    // Create Backup in Dexie
    const backupId = await db.backups.add({
      name: file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileSize: file.size,
      processingMode: 'local',
      status: 'processing',
      totalFiles: scan.totalFiles,
      processedFiles: 0,
      totalRecords: 0,
      errors: 0,
      warnings: 0,
      createdAt: new Date().toISOString(),
      completedAt: null,
    });

    const targetFiles = scan.files.filter((f) => f.type === 'json' || f.type === 'html');
    const totalParseTargets = targetFiles.length;

    const rawContentItems: ContentItem[] = [];
    const rawCollections: Array<Record<string, unknown>> = [];
    const rawSocial: SocialConnection[] = [];
    const rawComments: Comment[] = [];
    const rawLikes: Like[] = [];
    const rawMessages: Message[] = [];
    const rawStories: Story[] = [];

    // 4 & 5. Stages: parsing_html & parsing_json
    let processedCount = 0;
    for (const f of targetFiles) {
      if (this.isCancelled) {
        await db.backups.update(backupId, { status: 'cancelled' });
        throw new Error('Processing cancelled by user.');
      }

      processedCount++;
      const currentStage: ProcessingStage = f.type === 'html' ? 'parsing_html' : 'parsing_json';
      const pct = Math.floor(25 + (processedCount / (totalParseTargets || 1)) * 40);

      emit(
        currentStage,
        pct,
        `Parsing ${f.name} (${processedCount}/${totalParseTargets})`,
        f.path,
        totalParseTargets,
        processedCount
      );

      try {
        const textContent = await f.entry.async('text');
        const parsed = parseArchiveFile(f.path, textContent);

        if (parsed.errors.length > 0) {
          errorsCount += parsed.errors.length;
          for (const err of parsed.errors) {
            await db.processingErrors.add({
              backupId,
              stage: currentStage,
              filePath: f.path,
              errorType: 'ParseError',
              message: err,
              severity: 'error',
              timestamp: new Date().toISOString(),
            });
          }
        }

        if (parsed.warnings.length > 0) {
          warningsCount += parsed.warnings.length;
        }

        // Categorize parsed items
        if (parsed.category === 'saved_posts' || parsed.category === 'links') {
          for (const item of parsed.items) {
            rawContentItems.push({
              ...(item as unknown as ContentItem),
              backupId,
              createdAt: new Date().toISOString(),
            });
          }
        } else if (parsed.category === 'collections') {
          rawCollections.push(...parsed.items);
        } else if (parsed.category === 'followers' || parsed.category === 'following') {
          for (const item of parsed.items) {
            rawSocial.push({
              ...(item as unknown as SocialConnection),
              backupId,
            });
          }
        } else if (parsed.category === 'comments') {
          for (const item of parsed.items) {
            rawComments.push({
              ...(item as unknown as Comment),
              backupId,
            });
          }
        } else if (parsed.category === 'likes') {
          for (const item of parsed.items) {
            rawLikes.push({
              ...(item as unknown as Like),
              backupId,
            });
          }
        } else if (parsed.category === 'messages') {
          for (const item of parsed.items) {
            rawMessages.push({
              ...(item as unknown as Message),
              backupId,
            });
          }
        } else if (parsed.category === 'stories') {
          for (const item of parsed.items) {
            rawStories.push({
              ...(item as unknown as Story),
              backupId,
            });
          }
        }
      } catch (err: unknown) {
        errorsCount++;
        await db.processingErrors.add({
          backupId,
          stage: currentStage,
          filePath: f.path,
          errorType: 'FileReadError',
          message: (err as Error).message,
          severity: 'error',
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 6. Stage: cleaning & merging collections into content items
    emit('cleaning', 68, 'Cleaning, linking collections, and normalizing URLs & creators...');

    // Index existing content items by normalizedUrl
    const urlToContentMap = new Map<string, ContentItem>();
    for (const item of rawContentItems) {
      if (item.normalizedUrl) {
        urlToContentMap.set(item.normalizedUrl, item);
      }
    }

    // Merge collection associations into content items
    for (const col of rawCollections) {
      const colName = (col.name as string) || 'Saved Collection';
      const colItems = (col.items as Array<Record<string, unknown>>) || [];

      for (const m of colItems) {
        const normUrl = m.normalizedUrl as string;
        if (!normUrl) continue;

        const existing = urlToContentMap.get(normUrl);
        if (existing) {
          // Tag collection name
          if (!existing.collectionName) {
            existing.collectionName = colName;
          }
          // Backfill caption if missing
          if (!existing.caption && m.caption) {
            existing.caption = m.caption as string;
          }
          // Backfill creator if missing
          if (!existing.creatorUsername && m.creatorUsername) {
            existing.creatorUsername = m.creatorUsername as string;
          }
          // Merge hashtags
          if (Array.isArray(m.hashtags)) {
            const hSet = new Set([...existing.hashtags, ...(m.hashtags as string[])]);
            existing.hashtags = Array.from(hSet);
          }
        } else {
          // Item exists in collection but wasn't in general saved posts
          const newItem: ContentItem = {
            backupId,
            contentType: (m.contentType as ContentItem['contentType']) || 'post',
            originalUrl: (m.originalUrl as string) || '',
            normalizedUrl: normUrl,
            shortcode: (m.shortcode as string) || null,
            creatorUsername: (m.creatorUsername as string) || null,
            caption: (m.caption as string) || null,
            collectionName: colName,
            hashtags: (m.hashtags as string[]) || [],
            savedAt: (m.savedAt as string) || null,
            mediaPath: null,
            sourceFile: (col.sourceFile as string) || (m.sourceFile as string) || '',
            metadataJson: (m.metadataJson as Record<string, unknown>) || null,
            isDuplicate: false,
            createdAt: new Date().toISOString(),
          };
          rawContentItems.push(newItem);
          urlToContentMap.set(normUrl, newItem);
        }
      }
    }

    // 7. Stage: classifying & 8. Stage: deduplicating
    emit('deduplicating', 75, 'Detecting and tagging duplicate content items...');
    const seenUrls = new Set<string>();
    for (const item of rawContentItems) {
      if (item.normalizedUrl) {
        if (seenUrls.has(item.normalizedUrl)) {
          item.isDuplicate = true;
        } else {
          seenUrls.add(item.normalizedUrl);
          item.isDuplicate = false;
        }
      }
    }

    // 9. Stage: storing to Dexie
    emit('storing', 82, 'Persisting structured records into IndexedDB...');

    // Batch insert ContentItems
    if (rawContentItems.length > 0) {
      await db.contentItems.bulkAdd(rawContentItems);
    }
    extractedRecordsCount += rawContentItems.length;

    // Build URL-to-ID lookup map for Collections
    const savedItemsInDb = await db.contentItems.where('backupId').equals(backupId).toArray();
    const urlToIdMap = new Map<string, number>();
    for (const s of savedItemsInDb) {
      if (s.id && s.normalizedUrl) {
        urlToIdMap.set(s.normalizedUrl, s.id);
      }
    }

    // Insert Collections and CollectionItems
    for (const col of rawCollections) {
      const colItems = (col.items as Array<{ normalizedUrl: string }>) || [];
      const colId = await db.collections.add({
        backupId,
        name: (col.name as string) || 'Unnamed Collection',
        instagramId: (col.instagramId as string) || null,
        itemCount: colItems.length,
        metadata: null,
        createdAt: new Date().toISOString(),
      });

      let pos = 0;
      for (const m of colItems) {
        const contentItemId = urlToIdMap.get(m.normalizedUrl);
        if (contentItemId) {
          await db.collectionItems.add({
            collectionId: colId,
            contentItemId,
            position: pos++,
          });
        }
      }
    }
    extractedRecordsCount += rawCollections.length;

    // Insert Social, Comments, Likes, Messages, Stories
    if (rawSocial.length > 0) {
      await db.socialConnections.bulkAdd(rawSocial);
      extractedRecordsCount += rawSocial.length;
    }
    if (rawComments.length > 0) {
      await db.comments.bulkAdd(rawComments);
      extractedRecordsCount += rawComments.length;
    }
    if (rawLikes.length > 0) {
      await db.likes.bulkAdd(rawLikes);
      extractedRecordsCount += rawLikes.length;
    }
    if (rawMessages.length > 0) {
      await db.messages.bulkAdd(rawMessages);
      extractedRecordsCount += rawMessages.length;
    }
    if (rawStories.length > 0) {
      await db.stories.bulkAdd(rawStories);
      extractedRecordsCount += rawStories.length;
    }

    // 10. Stage: generating_analytics & creators
    emit('generating_analytics', 92, 'Aggregating creators and building dashboard metrics...');

    const creatorMap = new Map<string, { reels: number; posts: number; total: number }>();
    for (const item of rawContentItems) {
      if (!item.creatorUsername) continue;
      const u = item.creatorUsername.toLowerCase();
      const curr = creatorMap.get(u) || { reels: 0, posts: 0, total: 0 };
      if (item.contentType === 'reel') curr.reels++;
      else curr.posts++;
      curr.total++;
      creatorMap.set(u, curr);
    }

    const creatorsToInsert: Creator[] = Array.from(creatorMap.entries()).map(([username, counts]) => ({
      backupId,
      username,
      profileUrl: `https://www.instagram.com/${username}/`,
      reelCount: counts.reels,
      postCount: counts.posts,
      totalContent: counts.total,
    }));

    if (creatorsToInsert.length > 0) {
      await db.creators.bulkAdd(creatorsToInsert);
    }

    // Update Backup completion
    const completedBackup: Backup = {
      id: backupId,
      name: file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileSize: file.size,
      processingMode: 'local',
      status: 'completed',
      totalFiles: scan.totalFiles,
      processedFiles: totalParseTargets,
      totalRecords: extractedRecordsCount,
      errors: errorsCount,
      warnings: warningsCount,
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
    };

    await db.backups.update(backupId, completedBackup);

    emit('complete', 100, `Processing complete! ${extractedRecordsCount} records extracted.`);
    return completedBackup;
  }
}

export const localProcessor = new LocalProcessingService();

