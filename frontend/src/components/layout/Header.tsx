import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, Database, ShieldCheck, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { db } from '../../db/database';
import type { Backup } from '../../types';

export function Header({
  onSearch,
}: {
  onSearch?: (query: string) => void;
}) {
  const navigate = useNavigate();
  const [backups, setBackups] = React.useState<Backup[]>([]);
  const [selectedBackupId, setSelectedBackupId] = React.useState<number | null>(null);

  React.useEffect(() => {
    async function fetchBackups() {
      try {
        const list = await db.backups.toArray();
        setBackups(list);
        if (list.length > 0) {
          const last = list[list.length - 1];
          setSelectedBackupId(last.id || null);
        }
      } catch {
        // empty db
      }
    }
    fetchBackups();
  }, []);

  return (
    <header className="h-16 px-6 border-b border-[#20202e] bg-[#0f0f16]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-30">
      {/* Search Bar */}
      <div className="relative w-80 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Global search (creators, captions, tags)..."
          onChange={(e) => onSearch && onSearch(e.target.value)}
          className="w-full h-9 pl-9 pr-4 rounded-lg bg-[#14141e] border border-[#252536] text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/80 transition-colors"
        />
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {backups.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-slate-300 bg-[#161622] px-3 py-1.5 rounded-lg border border-[#252536]">
            <Database className="w-3.5 h-3.5 text-violet-400" />
            <select
              value={selectedBackupId || ''}
              onChange={(e) => setSelectedBackupId(Number(e.target.value))}
              className="bg-transparent border-none text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              {backups.map((b) => (
                <option key={b.id} value={b.id} className="bg-[#181826]">
                  {b.name} ({b.totalRecords} records)
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Private Local Engine</span>
        </div>

        <Button
          onClick={() => navigate('/upload')}
          size="sm"
          className="gap-1.5 shadow-sm"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload Backup</span>
        </Button>
      </div>
    </header>
  );
}

