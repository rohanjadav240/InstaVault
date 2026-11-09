import React from 'react';
import { Heart, ExternalLink, Calendar, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import { formatDate } from '../utils/format';
import type { Like } from '../types';

export function LikesPage() {
  const [likes, setLikes] = React.useState<Like[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadLikes() {
      try {
        setIsLoading(true);
        const latestBackup = await db.backups.orderBy('id').last();
        if (!latestBackup || !latestBackup.id) {
          setIsLoading(false);
          return;
        }
        const data = await db.likes.where('backupId').equals(latestBackup.id).toArray();
        setLikes(data);
      } catch (err) {
        console.error('Failed to load likes:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadLikes();
  }, []);

  const filtered = likes.filter(
    (l) =>
      l.targetUser?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.targetUrl?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Heart className="w-6 h-6 text-pink-400" />
            <span>Liked Content</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Posts, comments, and media you have liked on Instagram ({likes.length} records)
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search account or URL..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          title="No Likes Found"
          description={
            likes.length === 0
              ? 'No liked posts were found in this Instagram backup.'
              : 'No likes match your search.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item, idx) => (
            <Card key={item.id || idx} className="p-4 border-[#232334] bg-[#13131e] space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-pink-300">
                  @{item.targetUser || 'Instagram User'}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {formatDate(item.timestamp)}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400 truncate">
                {item.targetUrl || 'Post like'}
              </p>
              {item.targetUrl && (
                <a href={item.targetUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="sm" className="w-full gap-1.5 text-xs">
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Liked Post</span>
                  </Button>
                </a>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

