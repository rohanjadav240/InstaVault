import React from 'react';
import {
  Image as ImageIcon,
  ExternalLink,
  Copy,
  Check,
  Search,
  User,
  Calendar,
  Layers,
  FolderHeart,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import { formatDate } from '../utils/format';
import type { ContentItem } from '../types';

export function SavedPostsPage() {
  const [posts, setPosts] = React.useState<ContentItem[]>([]);
  const [filteredPosts, setFilteredPosts] = React.useState<ContentItem[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCreator, setSelectedCreator] = React.useState<string>('all');
  const [selectedCollection, setSelectedCollection] = React.useState<string>('all');
  const [creators, setCreators] = React.useState<string[]>([]);
  const [collections, setCollections] = React.useState<string[]>([]);
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Pagination
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 12;

  React.useEffect(() => {
    async function loadPosts() {
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
          .filter((i) => i.contentType === 'post')
          .toArray();

        setPosts(items);

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
        console.error('Failed to load posts:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadPosts();
  }, []);

  React.useEffect(() => {
    let result = [...posts];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.caption?.toLowerCase().includes(q) ||
          p.creatorUsername?.toLowerCase().includes(q) ||
          p.collectionName?.toLowerCase().includes(q) ||
          p.hashtags?.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (selectedCreator !== 'all') {
      result = result.filter(
        (p) => p.creatorUsername?.toLowerCase() === selectedCreator.toLowerCase()
      );
    }

    if (selectedCollection !== 'all') {
      result = result.filter(
        (p) => p.collectionName?.toLowerCase() === selectedCollection.toLowerCase()
      );
    }

    setFilteredPosts(result);
    setCurrentPage(1);
  }, [posts, searchQuery, selectedCreator, selectedCollection]);

  const handleCopy = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const totalPages = Math.ceil(filteredPosts.length / pageSize);
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <ImageIcon className="w-6 h-6 text-blue-400" />
            <span>Saved Posts</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse and search your saved Instagram feed posts ({filteredPosts.length} posts found)
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
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

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search posts, caption, #tag..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {!isLoading && filteredPosts.length === 0 ? (
        <EmptyState
          title="No Posts Found"
          description={
            posts.length === 0
              ? 'Your backup does not contain any detected saved feed posts.'
              : 'No posts match your search query.'
          }
        />
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
          {paginatedPosts.map((post, idx) => (
            <Card
              key={post.id || idx}
              hoverEffect
              className="border-[#232334] bg-[#13131e] overflow-hidden break-inside-avoid"
            >
              {/* Media card top */}
              <div className="h-40 bg-gradient-to-tr from-blue-950/40 via-[#151522] to-violet-950/30 flex items-center justify-center relative p-4 border-b border-[#20202e]">
                <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300">
                  <ImageIcon className="w-6 h-6" />
                </div>

                {/* Collection Badge */}
                {post.collectionName && (
                  <span className="absolute top-2.5 left-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-200 border border-blue-400/30 backdrop-blur-sm flex items-center gap-1 shadow-sm max-w-[140px]">
                    <FolderHeart className="w-3 h-3 text-blue-300 flex-shrink-0" />
                    <span className="truncate">{post.collectionName}</span>
                  </span>
                )}

                {/* Shortcode Badge */}
                {post.shortcode && (
                  <span className="absolute top-2.5 right-2.5 text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 text-slate-300 border border-white/10">
                    {post.shortcode}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-blue-300 truncate">
                    {post.creatorUsername ? `@${post.creatorUsername}` : post.collectionName ? `In ${post.collectionName}` : 'Instagram Post'}
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {formatDate(post.savedAt)}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed line-clamp-4 whitespace-pre-line">
                  {post.caption || (
                    <span className="italic text-slate-500">
                      {post.collectionName ? `Saved in collection "${post.collectionName}"` : 'Instagram Post from your backup'}
                    </span>
                  )}
                </p>

                {post.hashtags && post.hashtags.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {post.hashtags.slice(0, 3).map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] text-blue-400/80 bg-blue-950/30 px-1.5 py-0.5 rounded border border-blue-800/30 font-mono"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-[#20202e]">
                  <a
                    href={post.originalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1"
                  >
                    <Button variant="secondary" size="sm" className="w-full gap-1.5 text-xs">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Open Post</span>
                    </Button>
                  </a>
                  <Button
                    onClick={() => handleCopy(post.originalUrl)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-white"
                  >
                    {copiedUrl === post.originalUrl ? (
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
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-[#232334] pt-4">
          <p className="text-xs text-slate-400">
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, filteredPosts.length)} of {filteredPosts.length} posts
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
