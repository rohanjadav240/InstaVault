import React from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  CheckCircle,
  HardDrive,
  Filter,
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { exportLocalData } from '../services/exportService';
import { db } from '../db/database';
import type { ExportOptions } from '../types';

export function ExportCenterPage() {
  const [format, setFormat] = React.useState<ExportOptions['format']>('csv');
  const [scope, setScope] = React.useState<ExportOptions['scope']>('all');
  const [includeMetadata, setIncludeMetadata] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);
  const [latestBackupId, setLatestBackupId] = React.useState<number | null>(null);
  const [isSuccess, setIsSuccess] = React.useState(false);

  React.useEffect(() => {
    async function getBackup() {
      const b = await db.backups.orderBy('id').last();
      if (b && b.id) setLatestBackupId(b.id);
    }
    getBackup();
  }, []);

  const handleExport = async () => {
    if (!latestBackupId) return;
    setIsExporting(true);
    setIsSuccess(false);
    try {
      await exportLocalData(latestBackupId, {
        format,
        scope,
        includeMetadata,
      });
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <Download className="w-6 h-6 text-violet-400" />
          <span>Export Center</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Export your parsed and cleaned Instagram data into structured files
        </p>
      </div>

      <Card className="border-[#232334] bg-[#12121c] p-6 space-y-6">
        {/* Format Selection */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            1. Select Export Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'csv', label: 'CSV File', desc: 'Standard spreadsheet format', icon: FileSpreadsheet },
              { id: 'xlsx', label: 'Excel (XLSX)', desc: 'Formatted Microsoft Excel workbook', icon: FileSpreadsheet },
              { id: 'json', label: 'JSON Dataset', desc: 'Raw nested records with metadata', icon: FileCode },
            ].map((fmt) => {
              const Icon = fmt.icon;
              const isSelected = format === fmt.id;
              return (
                <div
                  key={fmt.id}
                  onClick={() => setFormat(fmt.id as ExportOptions['format'])}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-violet-500 bg-violet-950/20'
                      : 'border-[#262638] bg-[#151522] hover:border-[#383850]'
                  }`}
                >
                  <Icon className={`w-5 h-5 mb-2 ${isSelected ? 'text-violet-400' : 'text-slate-400'}`} />
                  <p className="text-sm font-semibold text-white">{fmt.label}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{fmt.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Scope Selection */}
        <div className="space-y-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
            2. Content Scope
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'all', label: 'All Saved Media' },
              { id: 'reels', label: 'Reels Only' },
              { id: 'posts', label: 'Feed Posts Only' },
            ].map((sc) => {
              const isSelected = scope === sc.id;
              return (
                <div
                  key={sc.id}
                  onClick={() => setScope(sc.id as ExportOptions['scope'])}
                  className={`p-3.5 rounded-lg border cursor-pointer text-center text-xs font-medium transition-all ${
                    isSelected
                      ? 'border-violet-500 bg-violet-600 text-white font-semibold'
                      : 'border-[#262638] bg-[#151522] text-slate-300 hover:border-[#383850]'
                  }`}
                >
                  {sc.label}
                </div>
              );
            })}
          </div>
        </div>

        {/* Options */}
        <div className="pt-2 border-t border-[#20202e]">
          <label className="flex items-center gap-2.5 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              className="rounded bg-[#1a1a28] border-[#303046] text-violet-600 focus:ring-0"
            />
            <span>Include raw metadata and extraction timestamps in output</span>
          </label>
        </div>

        {/* Export CTA */}
        <div className="pt-4 border-t border-[#20202e] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <HardDrive className="w-4 h-4 text-emerald-400" />
            <span>Files are compiled directly in browser memory and saved to disk.</span>
          </div>

          <Button
            onClick={handleExport}
            disabled={!latestBackupId || isExporting}
            isLoading={isExporting}
            className="gap-2 shadow-lg shadow-violet-900/40"
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download</span>
          </Button>
        </div>

        {isSuccess && (
          <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Export generated successfully! Download started.</span>
          </div>
        )}
      </Card>
    </div>
  );
}

