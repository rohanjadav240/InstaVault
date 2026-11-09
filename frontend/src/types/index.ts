// Content types
export type ContentType = 'reel' | 'post' | 'story' | 'igtv' | 'profile' | 'unknown';

export type ProcessingMode = 'local' | 'cloud';

export type ProcessingStage = 
  | 'idle'
  | 'validating'
  | 'extracting'
  | 'discovering'
  | 'parsing_html'
  | 'parsing_json'
  | 'cleaning'
  | 'classifying'
  | 'deduplicating'
  | 'storing'
  | 'generating_analytics'
  | 'complete'
  | 'error'
  | 'cancelled';

export interface ContentItem {
  id?: number;
  backupId: number;
  contentType: ContentType;
  originalUrl: string;
  normalizedUrl: string;
  shortcode: string | null;
  creatorUsername: string | null;
  caption: string | null;
  collectionName?: string | null;
  hashtags: string[];
  savedAt: string | null;
  mediaPath: string | null;
  sourceFile: string;
  metadataJson: Record<string, unknown> | null;
  isDuplicate: boolean;
  createdAt: string;
}

export interface Collection {
  id?: number;
  backupId: number;
  name: string;
  instagramId: string | null;
  itemCount: number;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CollectionItem {
  id?: number;
  collectionId: number;
  contentItemId: number;
  position: number | null;
}

export interface Creator {
  id?: number;
  backupId: number;
  username: string;
  profileUrl: string;
  reelCount: number;
  postCount: number;
  totalContent: number;
}

export interface SocialConnection {
  id?: number;
  backupId: number;
  connectionType: 'follower' | 'following';
  username: string;
  profileUrl: string | null;
  timestamp: string | null;
  sourceFile: string;
}

export interface Comment {
  id?: number;
  backupId: number;
  text: string;
  targetUser: string | null;
  targetUrl: string | null;
  timestamp: string | null;
  sourceFile: string;
}

export interface Like {
  id?: number;
  backupId: number;
  likeType: 'post' | 'comment' | 'story' | 'unknown';
  targetUser: string | null;
  targetUrl: string | null;
  timestamp: string | null;
  sourceFile: string;
}

export interface Message {
  id?: number;
  backupId: number;
  threadTitle: string | null;
  participants: string[];
  senderUsername: string | null;
  content: string;
  contentType: 'text' | 'media' | 'link' | 'other';
  timestamp: string | null;
  sourceFile: string;
  isEncrypted: boolean;
}

export interface Story {
  id?: number;
  backupId: number;
  mediaPath: string | null;
  mediaType: 'image' | 'video' | 'unknown';
  caption: string | null;
  timestamp: string | null;
  sourceFile: string;
}

export interface Backup {
  id?: number;
  name: string;
  fileName: string;
  fileSize: number;
  processingMode: ProcessingMode;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  totalFiles: number;
  processedFiles: number;
  totalRecords: number;
  errors: number;
  warnings: number;
  createdAt: string;
  completedAt: string | null;
}

export interface BackupFile {
  id?: number;
  backupId: number;
  filePath: string;
  fileType: 'html' | 'json' | 'image' | 'video' | 'other';
  fileSize: number;
  category: string | null;
  confidence: number;
  processed: boolean;
  errorMessage: string | null;
}

export interface ProcessingError {
  id?: number;
  backupId: number;
  stage: ProcessingStage;
  filePath: string | null;
  errorType: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  timestamp: string;
}

export interface ProcessingProgress {
  stage: ProcessingStage;
  percentage: number;
  currentFile: string | null;
  totalFiles: number;
  processedFiles: number;
  extractedRecords: number;
  errors: number;
  warnings: number;
  message: string;
}

export interface DashboardStats {
  totalRecords: number;
  savedReels: number;
  savedPosts: number;
  collections: number;
  uniqueCreators: number;
  duplicateRecords: number;
  mediaFiles: number;
  followers: number;
  following: number;
  likes: number;
  comments: number;
  messages: number;
  stories: number;
}

export interface ChartData {
  contentTypeDistribution: { name: string; value: number; }[];
  topCreators: { name: string; reels: number; posts: number; }[];
  hashtagFrequency: { tag: string; count: number; }[];
  collectionDistribution: { name: string; count: number; }[];
  savedTimeline: { month: string; count: number; }[];
}

export interface SearchFilters {
  query: string;
  contentType: ContentType | 'all';
  creator: string | null;
  collection: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  backupId: number | null;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx' | 'zip';
  scope: 'all' | 'reels' | 'posts' | 'collection' | 'creator';
  scopeId?: string;
  includeMetadata: boolean;
}
