import React from 'react';
import {
  Users,
  Film,
  Image as ImageIcon,
  ExternalLink,
  Search,
  ArrowUpDown,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import type { Creator } from '../types';

export function CreatorsPage() {
  const [creators, setCreators] = React.useState<Creator[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortField, setSortField] = React.useState<'total' | 'reels' | 'posts'>('total');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadCreators() {
      try {
        setIsLoading(true);
        const latestBackup = await db.backups.orderBy('id').last();
        if (!latestBackup || !latestBackup.id) {
          setIsLoading(false);
          return;
        }

        const list = await db.creators
          .where('backupId')
          .equals(latestBackup.id)
          .toArray();

        setCreators(list);
      } catch (err) {
        console.error('Failed to load creators:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCreators();
  }, []);

  const filteredCreators = creators
    .filter((c) => c.username.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      if (sortField === 'reels') return b.reelCount - a.reelCount;
      if (sortField === 'posts') return b.postCount - a.postCount;
      return b.totalContent - a.totalContent;
    });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-emerald-400" />
            <span>Creator Explorer</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Accounts you save content from the most ({creators.length} identified creators)
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search username..."
              className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
            />
          </div>

          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as 'total' | 'reels' | 'posts')}
            className="h-9 px-3 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 focus:outline-none focus:border-violet-500"
          >
            <option value="total">Most Total Content</option>
            <option value="reels">Most Reels</option>
            <option value="posts">Most Posts</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {!isLoading && filteredCreators.length === 0 ? (
        <EmptyState
          title="No Creators Found"
          description="No creator usernames were extracted from your saved posts or links."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCreators.map((creator, idx) => (
            <Card
              key={creator.id || idx}
              hoverEffect
              className="p-5 border-[#232334] bg-[#13131e] space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-emerald-300 font-bold text-sm flex-shrink-0">
                    @{creator.username.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-white text-sm truncate">
                      @{creator.username}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {creator.totalContent} saved {creator.totalContent === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                </div>

                {/* Counts breakdown */}
                <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded-lg bg-[#181826] border border-[#232334] flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-fuchsia-400" />
                      Reels
                    </span>
                    <span className="font-mono font-bold text-white">{creator.reelCount}</span>
                  </div>

                  <div className="p-2 rounded-lg bg-[#181826] border border-[#232334] flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
                      Posts
                    </span>
                    <span className="font-mono font-bold text-white">{creator.postCount}</span>
                  </div>
                </div>
              </div>

              <a
                href={creator.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block pt-2"
              >
                <Button variant="secondary" size="sm" className="w-full gap-1.5 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Instagram Profile</span>
                </Button>
              </a>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

