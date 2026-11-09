import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { db } from '../db/database';
import type { ContentItem, ExportOptions } from '../types';

export async function exportLocalData(backupId: number, options: ExportOptions) {
  let items: ContentItem[] = [];

  // Filter based on scope
  if (options.scope === 'reels') {
    items = await db.contentItems
      .where('backupId')
      .equals(backupId)
      .filter((i) => i.contentType === 'reel')
      .toArray();
  } else if (options.scope === 'posts') {
    items = await db.contentItems
      .where('backupId')
      .equals(backupId)
      .filter((i) => i.contentType === 'post')
      .toArray();
  } else if (options.scope === 'creator' && options.scopeId) {
    items = await db.contentItems
      .where('backupId')
      .equals(backupId)
      .filter((i) => i.creatorUsername?.toLowerCase() === options.scopeId?.toLowerCase())
      .toArray();
  } else {
    items = await db.contentItems.where('backupId').equals(backupId).toArray();
  }

  const exportRows = items.map((item) => ({
    Type: item.contentType,
    Creator: item.creatorUsername || '',
    URL: item.originalUrl,
    Normalized_URL: item.normalizedUrl,
    Shortcode: item.shortcode || '',
    Caption: item.caption || '',
    Hashtags: (item.hashtags || []).join(' '),
    Saved_At: item.savedAt || '',
    Is_Duplicate: item.isDuplicate ? 'Yes' : 'No',
    Source_File: item.sourceFile,
  }));

  const filenameBase = `instavault_export_${options.scope}_${new Date().toISOString().slice(0, 10)}`;

  if (options.format === 'json') {
    const jsonStr = JSON.stringify(options.includeMetadata ? items : exportRows, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    saveAs(blob, `${filenameBase}.json`);
    return;
  }

  if (options.format === 'csv') {
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const csvStr = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filenameBase}.csv`);
    return;
  }

  if (options.format === 'xlsx') {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows);
    XLSX.utils.book_append_sheet(wb, ws, 'Saved Content');
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `${filenameBase}.xlsx`);
    return;
  }

  // Fallback JSON
  const blob = new Blob([JSON.stringify(exportRows, null, 2)], { type: 'application/json' });
  saveAs(blob, `${filenameBase}.json`);
}

