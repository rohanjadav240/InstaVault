import React from 'react';
import {
  Film,
  ExternalLink,
  Copy,
  Check,
  LayoutGrid,
  List as ListIcon,
  Search,
  Calendar,
  User,
  Hash,
  FolderHeart,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import { formatDate, truncateText } from '../utils/format';
import type { ContentItem } from '../types';

export function SavedReelsPage() {
  const [reels, setReels] = React.useState<ContentItem[]>([]);
  const [filteredReels, setFilteredReels] = React.useState<ContentItem[]>([]);
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCreator, setSelectedCreator] = React.useState<string>('all');
  const [selectedCollection, setSelectedCollection] = React.useState<string>('all');
  const [sortOrder, setSortOrder] = React.useState<'newest' | 'oldest'>('newest');
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);
  const [creators, setCreators] = React.useState<string[]>([]);
  const [collections, setCollections] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 12;

  React.useEffect(() => {
    async function loadReels() {
      try {
        setIsLoading(true);
        const latestBackup = await db.backups.orderBy('id').last();
        if (!latestBackup || !latestBackup.id) {
          setIsLoading(false);
          return;
        }

        const items = await db.contentItems
          .where('backupId')
          .equals(latestBackup.id)
          .filter((i) => i.contentType === 'reel')
          .toArray();

        setReels(items);

        // Extract unique creators and collections
        const cSet = new Set<string>();
        const colSet = new Set<string>();
        for (const item of items) {
          if (item.creatorUsername) cSet.add(item.creatorUsername);
          if (item.collectionName) colSet.add(item.collectionName);
        }
        setCreators(Array.from(cSet).sort());
        setCollections(Array.from(colSet).sort());
      } catch (err) {
        console.error('Failed to load reels:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReels();
  }, []);

  // Filtering & Sorting
  React.useEffect(() => {
    let result = [...reels];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.caption?.toLowerCase().includes(q) ||
          r.creatorUsername?.toLowerCase().includes(q) ||
          r.collectionName?.toLowerCase().includes(q) ||
          r.hashtags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedCreator !== 'all') {
      result = result.filter(
        (r) => r.creatorUsername?.toLowerCase() === selectedCreator.toLowerCase()
      );
    }

    if (selectedCollection !== 'all') {
      result = result.filter(
        (r) => r.collectionName?.toLowerCase() === selectedCollection.toLowerCase()
      );
    }

    result.sort((a, b) => {
      const timeA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
      const timeB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
      return sortOrder === 'newest' ? timeB - timeA : timeA - timeB;
    });

    setFilteredReels(result);
    setCurrentPage(1);
  }, [reels, searchQuery, selectedCreator, selectedCollection, sortOrder]);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const totalPages = Math.ceil(filteredReels.length / pageSize);
  const paginatedReels = filteredReels.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Film className="w-6 h-6 text-fuchsia-400" />
            <span>Saved Reels</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, filter, and inspect your saved Instagram Reels ({filteredReels.length} found)
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-[#141420] p-1 rounded-lg border border-[#232334]">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              viewMode === 'grid' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              viewMode === 'list' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search caption, creator, #tag, collection..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Collection Filter */}
          {collections.length > 0 && (
            <select
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
              className="h-9 px-3 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 focus:outline-none focus:border-violet-500"
            >
              <option value="all">All Collections ({collections.length})</option>
              {collections.map((c) => (
                <option key={c} value={c}>
                  📁 {c}
                </option>
              ))}
            </select>
          )}

          {/* Creator Filter */}
          <select
            value={selectedCreator}
            onChange={(e) => setSelectedCreator(e.target.value)}
            className="h-9 px-3 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 focus:outline-none focus:border-violet-500 max-w-[180px]"
          >
            <option value="all">All Creators ({creators.length})</option>
            {creators.map((c) => (
              <option key={c} value={c}>
                @{c}
              </option>
            ))}
          </select>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
            className="h-9 px-3 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 focus:outline-none focus:border-violet-500"
          >
            <option value="newest">Newest Saved</option>
            <option value="oldest">Oldest Saved</option>
          </select>
        </div>
      </div>

      {/* Grid or List */}
      {!isLoading && filteredReels.length === 0 ? (
        <EmptyState
          title="No Reels Found"
          description={
            reels.length === 0
              ? 'Your backup does not contain any detected saved Reels.'
              : 'No Reels match your current filter criteria.'
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedReels.map((reel, idx) => (
            <Card
              key={reel.id || idx}
              hoverEffect
              className="border-[#232334] bg-[#13131e] overflow-hidden flex flex-col justify-between"
            >
              {/* Media preview / Styled Reel placeholder */}
              <div className="h-44 bg-gradient-to-br from-violet-950/60 via-[#161624] to-fuchsia-950/40 relative flex items-center justify-center p-4 border-b border-[#20202e]">
                <div className="w-12 h-12 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-300 shadow-lg">
                  <Film className="w-6 h-6" />
                </div>

                {/* Collection Badge */}
                {reel.collectionName && (
                  <span className="absolute top-2.5 left-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-violet-600/40 text-violet-200 border border-violet-400/30 backdrop-blur-sm flex items-center gap-1 shadow-sm max-w-[140px]">
                    <FolderHeart className="w-3 h-3 text-fuchsia-300 flex-shrink-0" />
                    <span className="truncate">{reel.collectionName}</span>
                  </span>
                )}

                {/* Shortcode Badge */}
                {reel.shortcode && (
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-slate-300 border border-white/10">
                    {reel.shortcode}
                  </span>
                )}
                {reel.isDuplicate && !reel.collectionName && (
                  <span className="absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Duplicate
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-violet-300 flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {reel.creatorUsername ? `@${reel.creatorUsername}` : reel.collectionName ? `In ${reel.collectionName}` : 'Instagram Reel'}
                      </span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono flex-shrink-0">
                      {formatDate(reel.savedAt)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed whitespace-pre-line">
                    {reel.caption || (
                      <span className="italic text-slate-500">
                        {reel.collectionName ? `Saved in collection "${reel.collectionName}"` : 'Instagram Reel from your backup'}
                      </span>
                    )}
                  </p>

                  {/* Hashtags */}
                  {reel.hashtags && reel.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {reel.hashtags.slice(0, 3).map((tag, i) => (
                        <span
                          key={i}
                          className="text-[10px] text-violet-400/80 bg-violet-950/40 px-1.5 py-0.5 rounded border border-violet-800/30 font-mono"
                        >
                          #{tag}
                        </span>
                      ))}
                      {reel.hashtags.length > 3 && (
                        <span className="text-[10px] text-slate-500">
                          +{reel.hashtags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#20202e]">
                  <a
                    href={reel.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="secondary" size="sm" className="w-full gap-1.5 text-xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Reel</span>
                    </Button>
                  </a>
                  <Button
                    onClick={() => handleCopy(reel.originalUrl)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-white"
                  >
                    {copiedUrl === reel.originalUrl ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* List Mode */
        <div className="space-y-2">
          {paginatedReels.map((reel, idx) => (
            <Card
              key={reel.id || idx}
              hoverEffect
              className="p-4 border-[#232334] bg-[#13131e] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300 flex-shrink-0">
                  <Film className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-violet-300">
                      {reel.creatorUsername ? `@${reel.creatorUsername}` : reel.collectionName ? `In ${reel.collectionName}` : 'Instagram Reel'}
                    </span>
                    {reel.collectionName && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-950/60 text-violet-300 border border-violet-800/40 font-medium">
                        📁 {reel.collectionName}
                      </span>
                    )}
                    {reel.shortcode && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5">
                        {reel.shortcode}
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-mono">
                      {formatDate(reel.savedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 truncate">
                    {reel.caption || (
                      <span className="italic text-slate-500">
                        {reel.collectionName ? `Saved in collection "${reel.collectionName}"` : 'Instagram Reel'}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <a
                  href={reel.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none"
                >
                  <Button variant="secondary" size="sm" className="gap-1.5 text-xs w-full sm:w-auto">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </Button>
                </a>
                <Button
                  onClick={() => handleCopy(reel.originalUrl)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-white"
                >
                  {copiedUrl === reel.originalUrl ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#232334] pt-4">
          <p className="text-xs text-slate-400">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredReels.length)} of {filteredReels.length} reels
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="text-xs"
            >
              Previous
            </Button>
            <span className="text-xs text-slate-400 font-mono px-2">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
