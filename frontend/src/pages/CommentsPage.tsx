import React from 'react';
import { MessageCircle, ExternalLink, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import { formatDate } from '../utils/format';
import type { Comment } from '../types';

export function CommentsPage() {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadComments() {
      try {
        setIsLoading(true);
        const latestBackup = await db.backups.orderBy('id').last();
        if (!latestBackup || !latestBackup.id) {
          setIsLoading(false);
          return;
        }
        const data = await db.comments.where('backupId').equals(latestBackup.id).toArray();
        setComments(data);
      } catch (err) {
        console.error('Failed to load comments:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadComments();
  }, []);

  const filtered = comments.filter((c) =>
    c.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <MessageCircle className="w-6 h-6 text-violet-400" />
            <span>Comments</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Comments you have authored across Instagram posts ({comments.length} comments)
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search comment text..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          title="No Comments Found"
          description={
            comments.length === 0
              ? 'No comments found in this backup export.'
              : 'No comments match your search query.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((item, idx) => (
            <Card key={item.id || idx} className="p-4 border-[#232334] bg-[#13131e] space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-violet-300">Your Comment</span>
                <span className="font-mono text-[11px]">{formatDate(item.timestamp)}</span>
              </div>
              <p className="text-sm text-slate-200 leading-relaxed">{item.text}</p>
              {item.targetUrl && (
                <div className="pt-2">
                  <a href={item.targetUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-violet-400">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Original Post</span>
                    </Button>
                  </a>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

