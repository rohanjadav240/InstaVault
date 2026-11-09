import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Database,
  FileCheck,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Progress } from '../components/ui/Progress';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { localProcessor } from '../services/localProcessingService';
import type { ProcessingProgress, ProcessingStage } from '../types';

const STAGE_LABELS: Record<ProcessingStage, string> = {
  idle: 'Preparing archive',
  validating: '1. Archive Validation',
  extracting: '2. Safe File Extraction',
  discovering: '3. Recursive File Discovery',
  parsing_html: '4. HTML Document Parsing',
  parsing_json: '5. JSON Structure Parsing',
  cleaning: '6. Data Normalization & Cleaning',
  classifying: '7. URL & Content Classification',
  deduplicating: '8. Duplicate Record Detection',
  storing: '9. Database Storage (IndexedDB)',
  generating_analytics: '10. Analytics & Timeline Generation',
  complete: 'Processing Completed Successfully',
  error: 'Processing Error',
  cancelled: 'Processing Cancelled',
};

export function ProcessingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const file: File | undefined = location.state?.file;

  const [progress, setProgress] = React.useState<ProcessingProgress>({
    stage: 'validating',
    percentage: 5,
    currentFile: null,
    totalFiles: 0,
    processedFiles: 0,
    extractedRecords: 0,
    errors: 0,
    warnings: 0,
    message: 'Initializing parser engine...',
  });

  const [isProcessing, setIsProcessing] = React.useState(true);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!file) {
      // No file passed in route state, redirect to upload
      navigate('/upload');
      return;
    }

    let isMounted = true;

    async function runLocalProcessing() {
      try {
        setIsProcessing(true);
        await localProcessor.processZipFile(file!, (p) => {
          if (isMounted) setProgress(p);
        });
        if (isMounted) {
          setIsProcessing(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setIsProcessing(false);
          setErrorMessage((err as Error).message || 'Failed to process archive.');
          setProgress((prev) => ({
            ...prev,
            stage: 'error',
            message: (err as Error).message,
          }));
        }
      }
    }

    runLocalProcessing();

    return () => {
      isMounted = false;
    };
  }, [file, navigate]);

  const handleCancel = () => {
    localProcessor.cancel();
    setIsProcessing(false);
    setProgress((prev) => ({
      ...prev,
      stage: 'cancelled',
      message: 'Processing cancelled by user.',
    }));
  };

  const isComplete = progress.stage === 'complete';
  const isFailed = progress.stage === 'error' || progress.stage === 'cancelled';

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-950/50 border border-violet-800/40 text-violet-300 text-xs font-mono">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Stage: {STAGE_LABELS[progress.stage] || progress.stage}</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          {isComplete
            ? 'Archive Analysis Complete!'
            : isFailed
            ? 'Processing Stopped'
            : 'Analyzing Instagram Backup...'}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-mono truncate max-w-lg mx-auto">
          {progress.message}
        </p>
      </div>

      {/* Main Progress Card */}
      <Card className="border-[#27273a] bg-[#12121d] p-8 space-y-6 shadow-xl">
        {/* Progress Bar & Percentage */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="font-semibold text-white">Overall Progress</span>
            <span className="font-mono text-base font-bold text-violet-400">
              {progress.percentage.toFixed(0)}%
            </span>
          </div>
          <Progress value={progress.percentage} className="h-3" />
        </div>

        {/* Current File */}
        {progress.currentFile && (
          <div className="p-3 rounded-lg bg-[#181826] border border-[#262638] flex items-center gap-2.5 text-xs text-slate-300">
            <FileCheck className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span className="truncate">File: {progress.currentFile}</span>
          </div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
          <div className="p-3.5 rounded-lg bg-[#151522] border border-[#232334]">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Total Files
            </p>
            <p className="text-lg font-bold font-mono text-white mt-1">
              {progress.totalFiles}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#151522] border border-[#232334]">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Processed
            </p>
            <p className="text-lg font-bold font-mono text-violet-300 mt-1">
              {progress.processedFiles}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#151522] border border-[#232334]">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Records Extracted
            </p>
            <p className="text-lg font-bold font-mono text-emerald-400 mt-1">
              {progress.extractedRecords}
            </p>
          </div>

          <div className="p-3.5 rounded-lg bg-[#151522] border border-[#232334]">
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Errors / Warnings
            </p>
            <p className="text-lg font-bold font-mono text-amber-400 mt-1">
              {progress.errors} / {progress.warnings}
            </p>
          </div>
        </div>

        {/* Error message box if failed */}
        {errorMessage && (
          <div className="p-4 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-xs flex items-start gap-3">
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Processing Error</p>
              <p className="mt-1 text-red-300/80">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#232334]">
          {isProcessing ? (
            <Button
              onClick={handleCancel}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <XCircle className="w-4 h-4" />
              <span>Cancel Processing</span>
            </Button>
          ) : isComplete ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5" />
              <span>All records organized and saved!</span>
            </div>
          ) : (
            <Button onClick={() => navigate('/upload')} variant="secondary" size="sm">
              Try Another File
            </Button>
          )}

          {isComplete && (
            <Button
              onClick={() => navigate('/dashboard')}
              size="default"
              className="gap-2 shadow-lg shadow-violet-900/40"
            >
              <span>Explore Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

