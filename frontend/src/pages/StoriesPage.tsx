import React from 'react';
import { Clock, Film, Image as ImageIcon, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import { formatDate } from '../utils/format';
import type { Story } from '../types';

export function StoriesPage() {
  const [stories, setStories] = React.useState<Story[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadStories() {
      try {
        setIsLoading(true);
        const latestBackup = await db.backups.orderBy('id').last();
        if (!latestBackup || !latestBackup.id) {
          setIsLoading(false);
          return;
        }
        const data = await db.stories.where('backupId').equals(latestBackup.id).toArray();
        setStories(data);
      } catch (err) {
        console.error('Failed to load stories:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadStories();
  }, []);

  const filtered = stories.filter(
    (s) =>
      s.caption?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.mediaPath?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-purple-400" />
            <span>Story Archive</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Historical Instagram Stories archive entries ({stories.length} stories)
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search story..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          title="No Stories Found"
          description={
            stories.length === 0
              ? 'No story archive entries found in this backup export.'
              : 'No stories match your search.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item, idx) => (
            <Card key={item.id || idx} className="p-4 border-[#232334] bg-[#13131e] space-y-3">
              <div className="h-32 bg-purple-950/20 border border-purple-800/30 rounded-lg flex items-center justify-center text-purple-300">
                <Clock className="w-8 h-8 opacity-60" />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-white">Story</span>
                <span className="font-mono text-[11px]">{formatDate(item.timestamp)}</span>
              </div>
              {item.caption && <p className="text-xs text-slate-300">{item.caption}</p>}
              {item.mediaPath && (
                <p className="text-[10px] font-mono text-slate-500 truncate">{item.mediaPath}</p>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

