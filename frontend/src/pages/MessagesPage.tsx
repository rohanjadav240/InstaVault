import React from 'react';
import {
  Mail,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Search,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import { formatDate } from '../utils/format';
import type { Message } from '../types';

export function MessagesPage() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [revealedIds, setRevealedIds] = React.useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadMessages() {
      try {
        setIsLoading(true);
        const latestBackup = await db.backups.orderBy('id').last();
        if (!latestBackup || !latestBackup.id) {
          setIsLoading(false);
          return;
        }
        const data = await db.messages.where('backupId').equals(latestBackup.id).toArray();
        setMessages(data);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMessages();
  }, []);

  const toggleReveal = (id: number) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtered = messages.filter(
    (m) =>
      m.threadTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.senderUsername?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (revealedIds.has(m.id || 0) && m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Mail className="w-6 h-6 text-amber-400" />
            <span>Direct Messages</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Private direct message threads ({messages.length} messages)
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search threads..."
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#14141e] border border-[#262638] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>
      </div>

      {/* Privacy Notice Banner */}
      <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/30 flex items-start gap-3 text-xs text-amber-200">
        <ShieldAlert className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-white">Privacy Protected View</p>
          <p className="text-amber-200/80 mt-0.5">
            Messages are blurred by default to preserve discretion and privacy. Click "Reveal Content" on
            any individual message to inspect the text.
          </p>
        </div>
      </div>

      {/* Message List */}
      {!isLoading && filtered.length === 0 ? (
        <EmptyState
          title="No Messages Found"
          description={
            messages.length === 0
              ? 'No direct messages found in this backup export.'
              : 'No threads match your search.'
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((msg, idx) => {
            const isRevealed = msg.id ? revealedIds.has(msg.id) : false;
            return (
              <Card key={msg.id || idx} className="p-4 border-[#232334] bg-[#13131e] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-amber-400" />
                    <span className="font-semibold text-white">
                      {msg.threadTitle || 'Conversation'}
                    </span>
                    {msg.senderUsername && (
                      <span className="text-slate-400">from @{msg.senderUsername}</span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">
                    {formatDate(msg.timestamp)}
                  </span>
                </div>

                {/* Content with Blur */}
                <div className="relative p-3 rounded-lg bg-[#0e0e16] border border-[#20202e] min-h-[48px] flex items-center justify-between">
                  <p
                    className={`text-xs text-slate-200 transition-all duration-200 ${
                      isRevealed ? 'filter-none select-text' : 'filter blur-sm select-none'
                    }`}
                  >
                    {msg.content || '(Attachment or empty message)'}
                  </p>

                  <Button
                    onClick={() => msg.id && toggleReveal(msg.id)}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 text-[11px] gap-1 text-slate-400 hover:text-white flex-shrink-0 ml-4"
                  >
                    {isRevealed ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Reveal Content</span>
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

