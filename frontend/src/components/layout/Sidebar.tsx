import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Film,
  Image as ImageIcon,
  FolderHeart,
  Users,
  Heart,
  MessageCircle,
  UserPlus,
  UserCheck,
  Mail,
  Clock,
  Link as LinkIcon,
  BarChart3,
  Database,
  Download,
  Settings,
  Shield,
  Layers,
} from 'lucide-react';
import { cn } from '../../utils/cn';
import { db } from '../../db/database';

interface NavItem {
  name: string;
  to: string;
  icon: React.ElementType;
  countKey?: string;
}

const navItems: NavItem[] = [
  { name: 'Overview', to: '/dashboard', icon: LayoutDashboard },
  { name: 'Saved Reels', to: '/reels', icon: Film, countKey: 'reels' },
  { name: 'Saved Posts', to: '/posts', icon: ImageIcon, countKey: 'posts' },
  { name: 'Collections', to: '/collections', icon: FolderHeart, countKey: 'collections' },
  { name: 'Creators', to: '/creators', icon: Users, countKey: 'creators' },
  { name: 'Likes', to: '/likes', icon: Heart, countKey: 'likes' },
  { name: 'Comments', to: '/comments', icon: MessageCircle, countKey: 'comments' },
  { name: 'Followers', to: '/followers', icon: UserPlus, countKey: 'followers' },
  { name: 'Following', to: '/following', icon: UserCheck, countKey: 'following' },
  { name: 'Messages', to: '/messages', icon: Mail, countKey: 'messages' },
  { name: 'Stories', to: '/stories', icon: Clock, countKey: 'stories' },
  { name: 'Link Explorer', to: '/links', icon: LinkIcon, countKey: 'links' },
  { name: 'Analytics', to: '/analytics', icon: BarChart3 },
  { name: 'Backup Manager', to: '/backups', icon: Database, countKey: 'backups' },
  { name: 'Export Center', to: '/export', icon: Download },
  { name: 'Settings', to: '/settings', icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
  const location = useLocation();
  const [counts, setCounts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    async function loadCounts() {
      try {
        const latestBackup = await db.backups.orderBy('id').last();
        if (!latestBackup || !latestBackup.id) return;
        const bId = latestBackup.id;

        const [
          reels,
          posts,
          collections,
          creators,
          likes,
          comments,
          followers,
          following,
          messages,
          stories,
          backups,
        ] = await Promise.all([
          db.contentItems.where('backupId').equals(bId).filter((i) => i.contentType === 'reel').count(),
          db.contentItems.where('backupId').equals(bId).filter((i) => i.contentType === 'post').count(),
          db.collections.where('backupId').equals(bId).count(),
          db.creators.where('backupId').equals(bId).count(),
          db.likes.where('backupId').equals(bId).count(),
          db.comments.where('backupId').equals(bId).count(),
          db.socialConnections.where('backupId').equals(bId).filter((c) => c.connectionType === 'follower').count(),
          db.socialConnections.where('backupId').equals(bId).filter((c) => c.connectionType === 'following').count(),
          db.messages.where('backupId').equals(bId).count(),
          db.stories.where('backupId').equals(bId).count(),
          db.backups.count(),
        ]);

        setCounts({
          reels,
          posts,
          collections,
          creators,
          likes,
          comments,
          followers,
          following,
          messages,
          stories,
          links: reels + posts,
          backups,
        });
      } catch {
        // DB might be empty
      }
    }
    loadCounts();
  }, [location.pathname]);

  return (
    <aside
      className={cn(
        'w-64 flex-shrink-0 flex flex-col h-screen border-r border-[#20202e] bg-[#0c0c12]/95 backdrop-blur-md select-none sticky top-0 z-40',
        className
      )}
    >
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-[#1c1c28] gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-900/40 text-white">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            InstaVault
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-violet-600/30 text-violet-300 border border-violet-500/30">
              Pro
            </span>
          </span>
          <p className="text-[11px] text-slate-400">Instagram Archive</p>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Navigation
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const count = item.countKey ? counts[item.countKey] : undefined;

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all group',
                  isActive
                    ? 'bg-violet-600/15 text-violet-300 border border-violet-500/25 shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-[#161622]'
                )
              }
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4 transition-colors group-hover:text-violet-400" />
                <span>{item.name}</span>
              </div>
              {count !== undefined && count > 0 && (
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#1c1c28] text-slate-400 border border-[#2b2b3b]">
                  {count > 999 ? `${(count / 1000).toFixed(1)}k` : count}
                </span>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Mode pill */}
      <div className="p-4 border-t border-[#1c1c28] bg-[#09090e]">
        <div className="flex items-center gap-2.5 p-2 rounded-lg bg-[#14141e] border border-[#232332]">
          <Layers className="w-4 h-4 text-emerald-400" />
          <div className="text-xs">
            <p className="font-medium text-slate-200">Local Mode Active</p>
            <p className="text-[11px] text-slate-500">100% Private on Device</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

