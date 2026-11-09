import Dexie, { type Table } from 'dexie';
import type { 
  ContentItem, Collection, CollectionItem, Creator,
  SocialConnection, Comment, Like, Message, Story,
  Backup, BackupFile, ProcessingError 
} from '../types';

export class InstaVaultDB extends Dexie {
  contentItems!: Table<ContentItem, number>;
  collections!: Table<Collection, number>;
  collectionItems!: Table<CollectionItem, number>;
  creators!: Table<Creator, number>;
  socialConnections!: Table<SocialConnection, number>;
  comments!: Table<Comment, number>;
  likes!: Table<Like, number>;
  messages!: Table<Message, number>;
  stories!: Table<Story, number>;
  backups!: Table<Backup, number>;
  backupFiles!: Table<BackupFile, number>;
  processingErrors!: Table<ProcessingError, number>;

  constructor() {
    super('InstaVaultDB');
    this.version(1).stores({
      contentItems: '++id, backupId, contentType, normalizedUrl, shortcode, creatorUsername, collectionName, *hashtags, savedAt, sourceFile, isDuplicate',
      collections: '++id, backupId, name, instagramId',
      collectionItems: '++id, collectionId, contentItemId, position',
      creators: '++id, backupId, username',
      socialConnections: '++id, backupId, connectionType, username',
      comments: '++id, backupId, targetUser, timestamp',
      likes: '++id, backupId, likeType, targetUser, timestamp',
      messages: '++id, backupId, threadTitle, senderUsername, timestamp',
      stories: '++id, backupId, timestamp',
      backups: '++id, name, status, createdAt',
      backupFiles: '++id, backupId, fileType, category, processed',
      processingErrors: '++id, backupId, stage, severity, timestamp',
    });
    this.version(2).stores({
      contentItems: '++id, backupId, contentType, normalizedUrl, shortcode, creatorUsername, collectionName, *hashtags, savedAt, sourceFile, isDuplicate',
    });
  }
}

export const db = new InstaVaultDB();
