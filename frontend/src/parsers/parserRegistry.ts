import type { BrowserParseResult } from './baseParser';
import { parseJsonFile } from './jsonParser';
import { parseHtmlFile } from './htmlParser';

export function parseArchiveFile(filePath: string, content: string): BrowserParseResult {
  const lower = filePath.toLowerCase();

  if (lower.endsWith('.json')) {
    return parseJsonFile(filePath, content);
  }

  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return parseHtmlFile(filePath, content);
  }

  return {
    category: 'unknown',
    items: [],
    errors: [],
    warnings: [`Unsupported file format: ${filePath}`],
    sourceFile: filePath,
    confidence: 0,
  };
}

