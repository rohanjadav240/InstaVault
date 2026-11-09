import React from 'react';
import { UserPlus, ExternalLink, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import { formatDate } from '../utils/format';
import type { SocialConnection } from '../types';

export function FollowersPage() {
  const [followers, setFollowers] = React.useState<SocialConnection[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadFollowers() {
      try {
        setIsLoading(true);
        const latestBackup = await db.backups.orderBy('id').last();
        if (!latestBackup || !latestBackup.id) {
          setIsLoading(false);
          return;
        }
        const data = await db.socialConnections
          .where('backupId')
          .equals(latestBackup.id)
          .filter((c) => c.connectionType === 'follower')
          .toArray();
        setFollowers(data);
      } catch (err) {
        console.error('Failed to load followers:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadFollowers();
  }, []);

  const filtered = followers.filter((f) =>
    f.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <UserPlus className="w-6 h-6 text-teal-400" />
            <span>Followers</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Accounts following your profile ({followers.length} followers)
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search follower..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          title="No Followers Found"
          description={
            followers.length === 0
              ? 'No followers found in this backup export.'
              : 'No followers match your search.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((item, idx) => (
            <Card key={item.id || idx} className="p-4 border-[#232334] bg-[#13131e] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-teal-950/40 border border-teal-800/40 flex items-center justify-center text-teal-300 font-bold text-xs flex-shrink-0">
                  @{item.username.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold text-white truncate">@{item.username}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {formatDate(item.timestamp)}
                  </p>
                </div>
              </div>

              {item.profileUrl && (
                <a href={item.profileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400">
                    <ExternalLink className="w-3.5 h-3.5" />
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

