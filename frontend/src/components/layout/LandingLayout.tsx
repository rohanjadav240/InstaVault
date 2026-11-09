import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowRight } from 'lucide-react';
import { Button } from '../ui/Button';

export function LandingLayout({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-[#0b0b10] text-slate-100 antialiased selection:bg-violet-600/30 selection:text-violet-200">
      {/* Top Navbar */}
      <header className="h-18 px-6 lg:px-12 border-b border-[#1b1b26] bg-[#0c0c14]/80 backdrop-blur-md flex items-center justify-between sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-900/40 text-white">
            <Shield className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
            InstaVault
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-violet-600/20 text-violet-300 border border-violet-500/30">
              Explorer
            </span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300 font-medium">
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#privacy" className="hover:text-white transition-colors">
            Privacy & Security
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/dashboard')}
            variant="ghost"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Open Dashboard
          </Button>
          <Button
            onClick={() => navigate('/upload')}
            size="sm"
            className="gap-2 shadow-md shadow-violet-900/30"
          >
            <span>Upload Backup</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children || <Outlet />}</main>

      {/* Footer */}
      <footer className="border-t border-[#1a1a26] bg-[#08080d] py-12 px-6 lg:px-12 text-sm text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-violet-400" />
            <span className="font-semibold text-slate-200">InstaVault</span>
            <span className="text-slate-500">— Instagram Backup Explorer</span>
          </div>
          <p className="text-xs text-slate-500">
            Private, secure, and independent. Not affiliated with Instagram or Meta.
          </p>
        </div>
      </footer>
    </div>
  );
}

