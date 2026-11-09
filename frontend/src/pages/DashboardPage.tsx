import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Film,
  Image as ImageIcon,
  FolderHeart,
  Users,
  Copy,
  HardDrive,
  BarChart2,
  TrendingUp,
  Tag,
  ArrowUpRight,
  Upload,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import { formatNumber } from '../utils/format';
import type { Backup, ContentItem, Creator } from '../types';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];

export function DashboardPage() {
  const navigate = useNavigate();
  const [latestBackup, setLatestBackup] = React.useState<Backup | null>(null);
  const [stats, setStats] = React.useState({
    totalRecords: 0,
    savedReels: 0,
    savedPosts: 0,
    collections: 0,
    uniqueCreators: 0,
    duplicateRecords: 0,
    mediaFiles: 0,
  });

  const [contentTypeData, setContentTypeData] = React.useState<{ name: string; value: number }[]>([]);
  const [topCreatorsData, setTopCreatorsData] = React.useState<{ name: string; total: number }[]>([]);
  const [hashtagData, setHashtagData] = React.useState<{ name: string; count: number }[]>([]);
  const [timelineData, setTimelineData] = React.useState<{ month: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadDashboard() {
      try {
        setIsLoading(true);
        const backup = await db.backups.orderBy('id').last();
        if (!backup || !backup.id) {
          setIsLoading(false);
          return;
        }
        setLatestBackup(backup);
        const bId = backup.id;

        const [items, collectionsCount, creatorsList] = await Promise.all([
          db.contentItems.where('backupId').equals(bId).toArray(),
          db.collections.where('backupId').equals(bId).count(),
          db.creators.where('backupId').equals(bId).toArray(),
        ]);

        let reels = 0;
        let posts = 0;
        let duplicates = 0;
        const tagMap: Record<string, number> = {};
        const monthMap: Record<string, number> = {};

        for (const item of items) {
          if (item.contentType === 'reel') reels++;
          else posts++;

          if (item.isDuplicate) duplicates++;

          // Hashtags
          if (item.hashtags) {
            for (const tag of item.hashtags) {
              tagMap[tag] = (tagMap[tag] || 0) + 1;
            }
          }

          // Timeline
          if (item.savedAt) {
            const m = item.savedAt.slice(0, 7); // YYYY-MM
            monthMap[m] = (monthMap[m] || 0) + 1;
          }
        }

        setStats({
          totalRecords: items.length,
          savedReels: reels,
          savedPosts: posts,
          collections: collectionsCount,
          uniqueCreators: creatorsList.length,
          duplicateRecords: duplicates,
          mediaFiles: backup.totalFiles || items.length,
        });

        // Content type chart
        setContentTypeData([
          { name: 'Reels', value: reels },
          { name: 'Posts', value: posts },
        ].filter((d) => d.value > 0));

        // Top creators
        const sortedCreators = [...creatorsList]
          .sort((a, b) => b.totalContent - a.totalContent)
          .slice(0, 6)
          .map((c) => ({ name: c.username, total: c.totalContent }));
        setTopCreatorsData(sortedCreators);

        // Hashtags
        const sortedTags = Object.entries(tagMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 7)
          .map(([name, count]) => ({ name: `#${name}`, count }));
        setHashtagData(sortedTags);

        // Timeline
        const sortedMonths = Object.entries(monthMap)
          .sort((a, b) => a[0].localeCompare(b[0]))
          .slice(-8)
          .map(([month, count]) => ({ month, count }));
        setTimelineData(sortedMonths);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboard();
  }, []);

  if (!isLoading && !latestBackup) {
    return (
      <EmptyState
        title="No Instagram Backup Loaded"
        description="Upload your Instagram data export ZIP to view real metrics, browse saved content, and explore creators."
        actionLabel="Upload Instagram Backup"
        onAction={() => navigate('/upload')}
        className="my-16"
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Archive Overview</h1>
          <p className="text-xs text-slate-400">
            Active Backup: <span className="text-violet-400 font-medium">{latestBackup?.name}</span> ({latestBackup?.fileName})
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => navigate('/reels')} size="sm" variant="secondary" className="gap-1.5">
            <Film className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Browse Reels</span>
          </Button>
          <Button onClick={() => navigate('/upload')} size="sm" className="gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span>Upload New</span>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          { label: 'Total Saved', val: stats.totalRecords, icon: HardDrive, color: 'text-violet-400', to: '/links' },
          { label: 'Saved Reels', val: stats.savedReels, icon: Film, color: 'text-fuchsia-400', to: '/reels' },
          { label: 'Saved Posts', val: stats.savedPosts, icon: ImageIcon, color: 'text-blue-400', to: '/posts' },
          { label: 'Collections', val: stats.collections, icon: FolderHeart, color: 'text-rose-400', to: '/collections' },
          { label: 'Creators', val: stats.uniqueCreators, icon: Users, color: 'text-emerald-400', to: '/creators' },
          { label: 'Duplicates', val: stats.duplicateRecords, icon: Copy, color: 'text-amber-400', to: '/links' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <Card
              key={idx}
              hoverEffect
              onClick={() => navigate(kpi.to)}
              className="p-4 cursor-pointer border-[#222232] bg-[#13131e]"
            >
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-medium uppercase tracking-wider">{kpi.label}</span>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-2xl font-bold font-mono text-white">{formatNumber(kpi.val)}</p>
            </Card>
          );
        })}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content Type Breakdown */}
        <Card className="border-[#222232] bg-[#13131e]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Content Type Distribution</span>
              <BarChart2 className="w-4 h-4 text-violet-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64 flex items-center justify-center">
            {contentTypeData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={contentTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {contentTypeData.map((_, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#181826', borderColor: '#2e2e42', borderRadius: '8px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-slate-500">No content type distribution available</p>
            )}
          </CardContent>
        </Card>

        {/* Top Creators Leaderboard */}
        <Card className="border-[#222232] bg-[#13131e]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Top Creators by Saved Items</span>
              <Users className="w-4 h-4 text-fuchsia-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {topCreatorsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCreatorsData} layout="vertical" margin={{ left: 20, right: 20 }}>
                  <XAxis type="number" stroke="#64748b" fontSize={11} />
                  <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={11} width={80} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#181826', borderColor: '#2e2e42', borderRadius: '8px' }}
                  />
                  <Bar dataKey="total" fill="#a855f7" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No creator data extracted
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Area Chart */}
        <Card className="border-[#222232] bg-[#13131e]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Saved Activity Timeline</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {timelineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#181826', borderColor: '#2e2e42', borderRadius: '8px' }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Timestamp data unavailable in this export
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Hashtags */}
        <Card className="border-[#222232] bg-[#13131e]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Most Frequent Hashtags</span>
              <Tag className="w-4 h-4 text-amber-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {hashtagData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hashtagData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#181826', borderColor: '#2e2e42', borderRadius: '8px' }}
                  />
                  <Bar dataKey="count" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                No hashtags extracted from captions
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

