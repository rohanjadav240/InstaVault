import React from 'react';
import {
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Check,
  Search,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import { formatDate } from '../utils/format';
import type { ContentItem } from '../types';

export function LinkExplorerPage() {
  const [items, setItems] = React.useState<ContentItem[]>([]);
  const [filteredItems, setFilteredItems] = React.useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<string>('all');
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 15;

  React.useEffect(() => {
    async function loadItems() {
      try {
        setIsLoading(true);
        const latestBackup = await db.backups.orderBy('id').last();
        if (!latestBackup || !latestBackup.id) {
          setIsLoading(false);
          return;
        }

        const data = await db.contentItems.where('backupId').equals(latestBackup.id).toArray();
        setItems(data);
      } catch (err) {
        console.error('Failed to load links:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadItems();
  }, []);

  React.useEffect(() => {
    let result = [...items];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.originalUrl.toLowerCase().includes(q) ||
          i.creatorUsername?.toLowerCase().includes(q) ||
          i.caption?.toLowerCase().includes(q)
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((i) => i.contentType === typeFilter);
    }

    setFilteredItems(result);
    setCurrentPage(1);
  }, [items, searchQuery, typeFilter]);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const totalPages = Math.ceil(filteredItems.length / pageSize);
  const paginated = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <LinkIcon className="w-6 h-6 text-violet-400" />
            <span>Link Explorer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete searchable registry of all extracted URLs ({filteredItems.length} links)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search URLs, creators..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 focus:outline-none focus:border-violet-500"
          >
            <option value="all">All Types</option>
            <option value="reel">Reels</option>
            <option value="post">Posts</option>
            <option value="story">Stories</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {!isLoading && filteredItems.length === 0 ? (
        <EmptyState
          title="No Links Found"
          description="No URLs match your current filter settings."
        />
      ) : (
        <Card className="border-[#232334] bg-[#12121c] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#232334] bg-[#161624] text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="p-3.5 pl-5">Content Type</th>
                  <th className="p-3.5">Creator</th>
                  <th className="p-3.5">Instagram URL</th>
                  <th className="p-3.5">Saved Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e1e2d] text-slate-200">
                {paginated.map((row, idx) => (
                  <tr key={row.id || idx} className="hover:bg-[#181827] transition-colors">
                    <td className="p-3.5 pl-5 whitespace-nowrap">
                      <Badge
                        variant={
                          row.contentType === 'reel'
                            ? 'reel'
                            : row.contentType === 'post'
                            ? 'post'
                            : 'secondary'
                        }
                        className="uppercase text-[10px]"
                      >
                        {row.contentType}
                      </Badge>
                    </td>

                    <td className="p-3.5 whitespace-nowrap font-medium text-violet-300">
                      @{row.creatorUsername || 'unknown'}
                    </td>

                    <td className="p-3.5 max-w-xs truncate font-mono text-[11px] text-slate-400">
                      {row.originalUrl}
                    </td>

                    <td className="p-3.5 whitespace-nowrap font-mono text-slate-400 text-[11px]">
                      {formatDate(row.savedAt)}
                    </td>

                    <td className="p-3.5 whitespace-nowrap">
                      {row.isDuplicate ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Duplicate
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Original
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 pr-5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          onClick={() => handleCopy(row.originalUrl)}
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400"
                        >
                          {copiedUrl === row.originalUrl ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <a
                          href={row.originalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="secondary" size="sm" className="h-7 px-2.5 text-[11px] gap-1">
                            <ExternalLink className="w-3 h-3" />
                            <span>Open</span>
                          </Button>
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            variant="secondary"
            size="sm"
          >
            Previous
          </Button>
          <span className="text-xs text-slate-400 font-mono px-3">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            variant="secondary"
            size="sm"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

