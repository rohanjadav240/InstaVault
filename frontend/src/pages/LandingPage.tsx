import { useNavigate } from 'react-router-dom';
import {
  Upload,
  Search,
  BarChart3,
  Shield,
  Layers,
  FileCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  HardDrive,
  Cloud,
  FileText,
  HelpCircle,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-24 py-12 px-6 lg:px-12 max-w-7xl mx-auto">
      {/* Hero Section */}
      <section className="text-center space-y-6 pt-10 pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-violet-950/60 border border-violet-800/40 text-violet-300 text-xs font-medium tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          <span>Next-Gen Instagram Archive Analyzer</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-[1.15]">
          Your Instagram memories,{' '}
          <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
            beautifully organized.
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Turn your Instagram backup into a searchable, visual archive. Browse your saved Reels,
          posts, collections, creators, and analytics without losing context.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Button
            onClick={() => navigate('/upload')}
            size="lg"
            className="w-full sm:w-auto gap-2 shadow-xl shadow-violet-900/40 text-base"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Instagram Backup</span>
          </Button>
          <a href="#features">
            <Button variant="secondary" size="lg" className="w-full sm:w-auto gap-2 text-base">
              <span>Explore Features</span>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Button>
          </a>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How InstaVault Works
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            From raw download ZIP to a responsive visual dashboard in three simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-[#232334] bg-[#12121c]">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-lg">
                1
              </div>
              <h3 className="text-lg font-semibold text-white">Download Your Data</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Request your data export from Instagram via Settings → Your Activity → Download Your
                Information (select JSON or HTML).
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#232334] bg-[#12121c]">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-fuchsia-600/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 font-bold text-lg">
                2
              </div>
              <h3 className="text-lg font-semibold text-white">Upload & Analyze</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Drag and drop your ZIP into InstaVault. Choose Local Mode for 100% offline private
                parsing directly inside your browser.
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#232334] bg-[#12121c]">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
                3
              </div>
              <h3 className="text-lg font-semibold text-white">Explore & Search</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Browse saved Reels with preview cards, filter by creator or collection, review
                analytics, and export curated datasets.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Key Features */}
      <section id="features" className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Key Features Built for Power Users
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Everything you need to regain control over your Instagram archive.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: Search,
              title: 'Universal Search & Filter',
              desc: 'Find any saved item instantly across captions, hashtags, creator usernames, and collection names.',
            },
            {
              icon: Layers,
              title: 'Reels & Posts Galleries',
              desc: 'Pinterest-style masonry grids and responsive card layouts with direct link actions and creator badges.',
            },
            {
              icon: BarChart3,
              title: 'Interactive Analytics',
              desc: 'Real distribution charts, top creator leaderboards, hashtag frequency clouds, and monthly save timelines.',
            },
            {
              icon: FileCheck,
              title: 'HTML & JSON Support',
              desc: 'Adaptive parser engine handles older and modern Instagram export formats automatically.',
            },
            {
              icon: Shield,
              title: 'Duplicate Detection',
              desc: 'Identifies multiple references to the same media across collections without deleting source records.',
            },
            {
              icon: FileText,
              title: 'Multi-Format Export',
              desc: 'Export filtered selections to CSV, Excel (XLSX), JSON, or standalone organized data files.',
            },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <Card key={i} className="border-[#232334] bg-[#13131e]/80 p-6 space-y-3">
                <div className="w-10 h-10 rounded-lg bg-violet-950/50 border border-violet-800/40 flex items-center justify-center text-violet-400">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-base font-semibold text-white">{item.title}</h4>
                <p className="text-xs text-slate-400 leading-relaxed">{item.desc}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Local vs Cloud Processing */}
      <section id="privacy" className="space-y-12">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Local vs Cloud Processing
          </h2>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Choose the privacy and convenience tier that fits your needs.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Local Mode Card */}
          <Card className="border-violet-500/40 bg-gradient-to-b from-[#161626] to-[#11111a] p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-bl-xl uppercase tracking-wider">
              Recommended
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-300">
                <HardDrive className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Local Processing</h3>
                <p className="text-xs text-slate-400">Private processing. Your ZIP stays on your device.</p>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-slate-300">
              {[
                '100% Client-side JSZip extraction',
                'IndexedDB (Dexie.js) browser storage',
                'Zero data uploaded to any server or API',
                'Works completely offline once loaded',
                'Instant local CSV, Excel, and JSON exports',
                'No login or account creation required',
              ].map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => navigate('/upload')}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            >
              Start Local Processing
            </Button>
          </Card>

          {/* Cloud Mode Card */}
          <Card className="border-[#262638] bg-[#12121c] p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-300">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Cloud Processing</h3>
                <p className="text-xs text-slate-400">Save your archive securely and access across devices.</p>
              </div>
            </div>

            <ul className="space-y-3 text-sm text-slate-300">
              {[
                'FastAPI Python parsing engine',
                'Secure isolated PostgreSQL database',
                'Multi-device persistent access',
                'Deep background processing for multi-GB archives',
                'Per-user authorization and retention limits',
                'Configurable backup comparison tools',
              ].map((feat, idx) => (
                <li key={idx} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <Button
              onClick={() => navigate('/upload')}
              variant="secondary"
              className="w-full"
            >
              Select Cloud Mode
            </Button>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="space-y-8 max-w-3xl mx-auto">
        <div className="text-center space-y-3">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-400 text-sm">
            Answers to common questions about Instagram backups and data privacy.
          </p>
        </div>

        <div className="space-y-4">
          {[
            {
              q: 'Where do I get my Instagram ZIP backup file?',
              a: 'In the Instagram app or website, go to Settings & Privacy → Accounts Center → Your Information and Permissions → Download Your Information. Request a copy in JSON or HTML format.',
            },
            {
              q: 'Can InstaVault read my Instagram password or login credentials?',
              a: 'Never. Instagram export ZIP files do not include passwords. InstaVault only reads the exported activity files (saved media, collections, comments).',
            },
            {
              q: 'Does Local Processing send any data to your servers?',
              a: 'No. When you choose Local Processing, everything runs in your browser via Web APIs and JSZip. The file never leaves your machine.',
            },
            {
              q: 'What formats are supported for export?',
              a: 'You can export your cleaned data into CSV, XLSX (Microsoft Excel), JSON, or download individual structured sets.',
            },
          ].map((faq, i) => (
            <Card key={i} className="border-[#222232] bg-[#12121b] p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-medium text-sm">
                <HelpCircle className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span>{faq.q}</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed pl-6">{faq.a}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

