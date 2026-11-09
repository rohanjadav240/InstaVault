import React from 'react';
import {
  Settings,
  Shield,
  HardDrive,
  Trash2,
  Lock,
  Database,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { db } from '../db/database';
import { formatFileSize, formatNumber } from '../utils/format';

export function SettingsPage() {
  const [dbStats, setDbStats] = React.useState({
    backups: 0,
    contentItems: 0,
    collections: 0,
    creators: 0,
    social: 0,
    likes: 0,
    comments: 0,
    messages: 0,
    stories: 0,
    estimatedBytes: 0,
  });

  const [clearDialogOpen, setClearDialogOpen] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);

  // Load local database statistics
  const loadStats = async () => {
    try {
      const [
        backups,
        contentItems,
        collections,
        creators,
        social,
        likes,
        comments,
        messages,
        stories,
      ] = await Promise.all([
        db.backups.count(),
        db.contentItems.count(),
        db.collections.count(),
        db.creators.count(),
        db.socialConnections.count(),
        db.likes.count(),
        db.comments.count(),
        db.messages.count(),
        db.stories.count(),
      ]);

      // Estimate IndexedDB storage size
      let estimatedBytes = 0;
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        estimatedBytes = estimate.usage || 0;
      }

      setDbStats({
        backups,
        contentItems,
        collections,
        creators,
        social,
        likes,
        comments,
        messages,
        stories,
        estimatedBytes,
      });
    } catch (err) {
      console.error('Failed to load DB stats:', err);
    }
  };

  React.useEffect(() => {
    loadStats();
  }, []);

  const handleClearAllData = async () => {
    try {
      setIsClearing(true);
      await Promise.all([
        db.contentItems.clear(),
        db.collections.clear(),
        db.collectionItems.clear(),
        db.creators.clear(),
        db.socialConnections.clear(),
        db.comments.clear(),
        db.likes.clear(),
        db.messages.clear(),
        db.stories.clear(),
        db.backups.clear(),
        db.backupFiles.clear(),
        db.processingErrors.clear(),
      ]);
      setClearDialogOpen(false);
      setSuccessMsg('All local records and caches cleared cleanly.');
      await loadStats();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err) {
      console.error('Clear DB error:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-violet-400" />
          <span>Application Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage local IndexedDB storage, privacy controls, and processing behavior
        </p>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Storage Information */}
      <Card className="border-[#232334] bg-[#12121c]">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center justify-between">
            <span className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-violet-400" />
              <span>Browser Storage Utilization</span>
            </span>
            <Button
              onClick={loadStats}
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-400 gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-slate-400">
            Data is persisted on this machine using your browser's IndexedDB engine (Dexie.js).
            No personal data is synchronized to any external server in Local Mode.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-[#181826] border border-[#232334]">
              <span className="text-slate-400">Approx. Storage Used</span>
              <p className="text-lg font-bold font-mono text-violet-400 mt-1">
                {formatFileSize(dbStats.estimatedBytes)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#181826] border border-[#232334]">
              <span className="text-slate-400">Backups Loaded</span>
              <p className="text-lg font-bold font-mono text-white mt-1">
                {formatNumber(dbStats.backups)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#181826] border border-[#232334]">
              <span className="text-slate-400">Saved Items</span>
              <p className="text-lg font-bold font-mono text-white mt-1">
                {formatNumber(dbStats.contentItems)}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-[#181826] border border-[#232334]">
              <span className="text-slate-400">Known Creators</span>
              <p className="text-lg font-bold font-mono text-white mt-1">
                {formatNumber(dbStats.creators)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security Guarantees */}
      <Card className="border-[#232334] bg-[#12121c]">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" />
            <span>Privacy & Security Parameters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs text-slate-300">
          <div className="flex items-center justify-between py-2 border-b border-[#20202e]">
            <div>
              <p className="font-medium text-white">Local-Only Processing Pipeline</p>
              <p className="text-slate-400 text-[11px]">
                Archives uncompressed into browser RAM and stored inside client-side IndexedDB.
              </p>
            </div>
            <span className="text-emerald-400 font-mono font-medium">Enforced</span>
          </div>

          <div className="flex items-center justify-between py-2 border-b border-[#20202e]">
            <div>
              <p className="font-medium text-white">ZIP Traversal & Bomb Protection</p>
              <p className="text-slate-400 text-[11px]">
                Prohibits relative paths (`../`) and guards against dangerous compression ratios.
              </p>
            </div>
            <span className="text-emerald-400 font-mono font-medium">Active</span>
          </div>

          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-medium text-white">Sensitive Content Protection</p>
              <p className="text-slate-400 text-[11px]">
                Direct Messages are obscured by default and require deliberate click to unmask.
              </p>
            </div>
            <span className="text-emerald-400 font-mono font-medium">Active</span>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-900/30 bg-red-950/10">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>Data Removal</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-400 leading-relaxed">
            Need to purge all saved archives and metadata from this computer? This will reset all
            local tables and return InstaVault to a pristine clean state.
          </p>
          <Button
            onClick={() => setClearDialogOpen(true)}
            variant="destructive"
            size="sm"
            className="gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Purge All Local Data</span>
          </Button>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        title="Wipe All Local Archive Data?"
        description="Are you sure you want to delete all parsed records, collections, messages, and backups stored in this browser? This action cannot be reversed."
      >
        <div className="flex justify-end gap-3 mt-6">
          <Button
            onClick={() => setClearDialogOpen(false)}
            variant="secondary"
            size="sm"
            disabled={isClearing}
          >
            Cancel
          </Button>
          <Button
            onClick={handleClearAllData}
            variant="destructive"
            size="sm"
            isLoading={isClearing}
          >
            Yes, Purge Everything
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
