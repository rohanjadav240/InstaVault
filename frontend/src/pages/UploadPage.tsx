import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud,
  FileArchive,
  HardDrive,
  Cloud,
  CheckCircle,
  AlertCircle,
  Shield,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { formatFileSize } from '../utils/format';
import type { ProcessingMode } from '../types';

export function UploadPage({
  onSelectFile,
}: {
  onSelectFile?: (file: File, mode: ProcessingMode) => void;
}) {
  const navigate = useNavigate();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [mode, setMode] = React.useState<ProcessingMode>('local');
  const [isDragging, setIsDragging] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const handleFile = (file: File) => {
    setValidationError(null);
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setValidationError('Please select a valid Instagram backup (.zip) archive.');
      return;
    }
    if (file.size > 1024 * 1024 * 1024 * 2) {
      setValidationError('Archive size exceeds 2 GB. Please choose a smaller backup or split archive.');
      return;
    }
    setSelectedFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleStartProcessing = () => {
    if (!selectedFile) return;
    if (onSelectFile) {
      onSelectFile(selectedFile, mode);
    }
    // Navigate to processing page passing state
    navigate('/processing', { state: { file: selectedFile, mode } });
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-8">
      {/* Title */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Upload Instagram Backup
        </h1>
        <p className="text-sm text-slate-400 max-w-lg mx-auto">
          Select your official Instagram data export ZIP. Choose how you want it processed.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
          Select Processing Mode
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mode A: Local */}
          <div
            onClick={() => setMode('local')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              mode === 'local'
                ? 'border-violet-500 bg-violet-950/20 shadow-md shadow-violet-950/30'
                : 'border-[#262638] bg-[#12121c] hover:border-[#383850]'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    mode === 'local'
                      ? 'bg-violet-600 text-white'
                      : 'bg-[#1e1e2d] text-slate-400'
                  }`}
                >
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Local Processing</h3>
                  <p className="text-xs text-violet-300 font-medium">100% Client-Side Privacy</p>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  mode === 'local'
                    ? 'border-violet-500 bg-violet-600 text-white'
                    : 'border-slate-600'
                }`}
              >
                {mode === 'local' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Private processing. Your ZIP stays on your device. Extracted files are parsed inside
              your browser with IndexedDB storage. Zero cloud transmission.
            </p>
          </div>

          {/* Mode B: Cloud */}
          <div
            onClick={() => setMode('cloud')}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              mode === 'cloud'
                ? 'border-blue-500 bg-blue-950/20 shadow-md shadow-blue-950/30'
                : 'border-[#262638] bg-[#12121c] hover:border-[#383850]'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    mode === 'cloud'
                      ? 'bg-blue-600 text-white'
                      : 'bg-[#1e1e2d] text-slate-400'
                  }`}
                >
                  <Cloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-white">Cloud Processing</h3>
                  <p className="text-xs text-blue-300 font-medium">Multi-Device Access</p>
                </div>
              </div>
              <div
                className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                  mode === 'cloud'
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-slate-600'
                }`}
              >
                {mode === 'cloud' && <div className="w-2 h-2 rounded-full bg-white" />}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed">
              Save your archive securely and access it across devices. Uploads to our FastAPI server
              with user-isolated database storage and background job tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-violet-500 bg-violet-950/30 scale-[1.01]'
            : selectedFile
            ? 'border-emerald-500/60 bg-emerald-950/10'
            : 'border-[#2d2d42] bg-[#12121d] hover:border-violet-500/50 hover:bg-[#151524]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFile(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
              selectedFile
                ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                : 'bg-violet-600/20 text-violet-400 border border-violet-500/30'
            }`}
          >
            {selectedFile ? (
              <FileArchive className="w-8 h-8" />
            ) : (
              <UploadCloud className="w-8 h-8" />
            )}
          </div>

          {selectedFile ? (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white text-base">
                  {selectedFile.name}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-400">
                Size: {formatFileSize(selectedFile.size)}
              </p>
              <p className="text-xs text-violet-400 hover:underline pt-2">
                Click or drag to choose a different file
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-medium text-slate-200 text-base">
                Drag & drop your Instagram ZIP archive here
              </p>
              <p className="text-xs text-slate-400">
                Or click to browse your computer (supports up to 2 GB)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Validation Error */}
      {validationError && (
        <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Action CTA */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>
            {mode === 'local'
              ? 'Zero network upload. ZIP is processed completely in browser memory.'
              : 'Encrypted transfer over TLS with isolated per-user PostgreSQL tenancy.'}
          </span>
        </div>

        <Button
          onClick={handleStartProcessing}
          disabled={!selectedFile}
          size="lg"
          className="w-full sm:w-auto gap-2 shadow-lg shadow-violet-900/40"
        >
          <span>Start Processing Archive</span>
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Instructions Card */}
      <Card className="border-[#232334] bg-[#101018] p-5">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-violet-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-semibold text-slate-200">How to get your Instagram Export:</h4>
            <p className="text-slate-400 leading-relaxed">
              Open Instagram → Settings & Activity → Accounts Center → Your information and
              permissions → Download your information → Request a download. Select "All available
              information" or "Saved posts", select JSON or HTML format, and confirm your request.
              Instagram will email you the download link.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

