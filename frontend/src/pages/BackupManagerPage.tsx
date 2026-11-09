import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Database,
  Trash2,
  GitCompare,
  Upload,
  Calendar,
  FileCheck,
  CheckCircle,
  AlertCircle,
  Layers,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Dialog } from '../components/ui/Dialog';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import { formatDate, formatFileSize } from '../utils/format';
import type { Backup } from '../types';

export function BackupManagerPage() {
  const navigate = useNavigate();
  const [backups, setBackups] = React.useState<Backup[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<number | null>(null);

  // Comparison State
  const [compareA, setCompareA] = React.useState<number | null>(null);
  const [compareB, setCompareB] = React.useState<number | null>(null);
  const [comparisonResult, setComparisonResult] = React.useState<{
    newInB: number;
    missingInB: number;
    shared: number;
  } | null>(null);

  const loadBackups = async () => {
    try {
      const list = await db.backups.toArray();
      setBackups(list);
      if (list.length >= 2) {
        setCompareA(list[0].id || null);
        setCompareB(list[1].id || null);
      }
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  };

  React.useEffect(() => {
    loadBackups();
  }, []);

  const handleDelete = async (id: number) => {
    try {
      await Promise.all([
        db.contentItems.where('backupId').equals(id).delete(),
        db.collections.where('backupId').equals(id).delete(),
        db.creators.where('backupId').equals(id).delete(),
        db.socialConnections.where('backupId').equals(id).delete(),
        db.comments.where('backupId').equals(id).delete(),
        db.likes.where('backupId').equals(id).delete(),
        db.messages.where('backupId').equals(id).delete(),
        db.stories.where('backupId').equals(id).delete(),
        db.backups.delete(id),
      ]);
      setDeleteConfirmId(null);
      await loadBackups();
    } catch (err) {
      console.error('Failed to delete backup:', err);
    }
  };

  const runComparison = async () => {
    if (!compareA || !compareB || compareA === compareB) return;
    try {
      const [itemsA, itemsB] = await Promise.all([
        db.contentItems.where('backupId').equals(compareA).toArray(),
        db.contentItems.where('backupId').equals(compareB).toArray(),
      ]);

      const urlsA = new Set(itemsA.map((i) => i.normalizedUrl).filter(Boolean));
      const urlsB = new Set(itemsB.map((i) => i.normalizedUrl).filter(Boolean));

      let shared = 0;
      let newInB = 0;

      for (const u of urlsB) {
        if (urlsA.has(u)) shared++;
        else newInB++;
      }

      let missingInB = 0;
      for (const u of urlsA) {
        if (!urlsB.has(u)) missingInB++;
      }

      setComparisonResult({ newInB, missingInB, shared });
    } catch (err) {
      console.error('Comparison error:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <Database className="w-6 h-6 text-violet-400" />
            <span>Backup Manager</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage loaded archives, compare snapshots, or remove local data
          </p>
        </div>

        <Button onClick={() => navigate('/upload')} size="sm" className="gap-2">
          <Upload className="w-4 h-4" />
          <span>Upload Another Backup</span>
        </Button>
      </div>

      {/* Backups List */}
      {backups.length === 0 ? (
        <EmptyState
          title="No Backups Stored"
          description="Upload an Instagram backup archive to begin browsing."
          actionLabel="Upload Backup"
          onAction={() => navigate('/upload')}
        />
      ) : (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
            Loaded Backups ({backups.length})
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {backups.map((b) => (
              <Card key={b.id} className="p-5 border-[#232334] bg-[#13131e] space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-white text-base">{b.name}</h3>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{b.fileName}</p>
                  </div>
                  <Badge variant={b.status === 'completed' ? 'success' : 'warning'}>
                    {b.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#181826] border border-[#232334]">
                    <span className="text-slate-400">Total Records</span>
                    <p className="font-mono font-bold text-white mt-0.5">{b.totalRecords}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#181826] border border-[#232334]">
                    <span className="text-slate-400">Archive Size</span>
                    <p className="font-mono font-bold text-white mt-0.5">{formatFileSize(b.fileSize)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-[#20202e]">
                  <span>Loaded {formatDate(b.createdAt)}</span>
                  <Button
                    onClick={() => b.id && setDeleteConfirmId(b.id)}
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Backup Comparison Tool */}
      {backups.length >= 2 && (
        <Card className="border-[#232334] bg-[#12121c] p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <GitCompare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Compare Two Backups</h2>
              <p className="text-xs text-slate-400">
                Identify new saved items and missing records between two snapshots
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Baseline Backup A</label>
              <select
                value={compareA || ''}
                onChange={(e) => setCompareA(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-[#161624] border border-[#28283a] text-xs text-slate-200"
              >
                {backups.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.totalRecords} records)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 mb-1 block">Newer Backup B</label>
              <select
                value={compareB || ''}
                onChange={(e) => setCompareB(Number(e.target.value))}
                className="w-full h-10 px-3 rounded-lg bg-[#161624] border border-[#28283a] text-xs text-slate-200"
              >
                {backups.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.totalRecords} records)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <Button onClick={runComparison} size="sm" className="gap-2">
            <GitCompare className="w-4 h-4" />
            <span>Run Snapshot Comparison</span>
          </Button>

          {comparisonResult && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[#232334] text-center">
              <div className="p-3.5 rounded-lg bg-[#181826] border border-[#252538]">
                <p className="text-xs text-slate-400 font-medium">Shared Records</p>
                <p className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {comparisonResult.shared}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#181826] border border-[#252538]">
                <p className="text-xs text-slate-400 font-medium">New in Backup B</p>
                <p className="text-xl font-bold font-mono text-violet-400 mt-1">
                  +{comparisonResult.newInB}
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-[#181826] border border-[#252538]">
                <p className="text-xs text-slate-400 font-medium">Missing in B</p>
                <p className="text-xl font-bold font-mono text-amber-400 mt-1">
                  -{comparisonResult.missingInB}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteConfirmId !== null}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete Backup Data?"
        description="This will permanently delete the backup and all its extracted records from your browser's IndexedDB."
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button onClick={() => setDeleteConfirmId(null)} variant="secondary" size="sm">
            Cancel
          </Button>
          <Button
            onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            variant="destructive"
            size="sm"
          >
            Confirm Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}

