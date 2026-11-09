import JSZip from 'jszip';

export interface DiscoveredFile {
  path: string;
  name: string;
  size: number;
  type: 'html' | 'json' | 'image' | 'video' | 'other';
  entry: JSZip.JSZipObject;
}

export interface ArchiveScanResult {
  totalFiles: number;
  totalSize: number;
  files: DiscoveredFile[];
  errors: string[];
}

const MAX_FILES = 25000;
const MAX_TOTAL_SIZE = 1024 * 1024 * 1024 * 2; // 2 GB uncompressed

export async function scanZipArchive(
  file: File,
  onProgress?: (percent: number, currentFile: string) => void
): Promise<{ zip: JSZip; scan: ArchiveScanResult }> {
  const zip = new JSZip();
  let loadedZip: JSZip;

  try {
    loadedZip = await zip.loadAsync(file, {
      // Progress reporting
      // @ts-expect-error JSZip onUpdate option
      onUpdate: (metadata: { percent: number; currentFile: string }) => {
        if (onProgress) {
          onProgress(metadata.percent, metadata.currentFile || 'Loading ZIP...');
        }
      },
    });
  } catch (err: unknown) {
    throw new Error(`Failed to read ZIP archive: ${(err as Error).message}`);
  }

  const result: ArchiveScanResult = {
    totalFiles: 0,
    totalSize: 0,
    files: [],
    errors: [],
  };

  const entries = Object.keys(loadedZip.files);
  if (entries.length > MAX_FILES) {
    throw new Error(`ZIP contains ${entries.length} files, exceeding limit of ${MAX_FILES}`);
  }

  for (const path of entries) {
    const entry = loadedZip.files[path];
    if (entry.dir) continue;

    // Path traversal check
    if (path.includes('../') || path.startsWith('/')) {
      result.errors.push(`Potentially unsafe path detected and skipped: ${path}`);
      continue;
    }

    // Determine type
    const lower = path.toLowerCase();
    let type: DiscoveredFile['type'] = 'other';
    if (lower.endsWith('.html') || lower.endsWith('.htm')) type = 'html';
    else if (lower.endsWith('.json')) type = 'json';
    else if (/\.(jpe?g|png|gif|webp)$/i.test(lower)) type = 'image';
    else if (/\.(mp4|mov|webm)$/i.test(lower)) type = 'video';

    // Uncompressed size estimate (JSZip internal _data)
    // @ts-expect-error accessing internal size if present
    const size = entry._data?.uncompressedSize || 0;
    result.totalSize += size;

    if (result.totalSize > MAX_TOTAL_SIZE) {
      throw new Error('Uncompressed archive size exceeds maximum safe limit (2 GB).');
    }

    result.files.push({
      path,
      name: path.split('/').pop() || path,
      size,
      type,
      entry,
    });
    result.totalFiles++;
  }

  return { zip: loadedZip, scan: result };
}

