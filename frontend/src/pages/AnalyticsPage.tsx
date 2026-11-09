import React from 'react';
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  Tag,
  ShieldCheck,
  CheckCircle,
  Copy,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { db } from '../db/database';
import { formatNumber } from '../utils/format';

const COLORS = ['#8b5cf6', '#ec4899', '#3b82f6', '#10b981', '#f59e0b'];

export function AnalyticsPage() {
  const [dataStats, setDataStats] = React.useState({
    total: 0,
    withCaption: 0,
    withTimestamp: 0,
    withCreator: 0,
    withHashtags: 0,
    duplicates: 0,
  });

  const [creatorsChart, setCreatorsChart] = React.useState<{ name: string; count: number }[]>([]);
  const [tagsChart, setTagsChart] = React.useState<{ name: string; count: number }[]>([]);
  const [monthlyChart, setMonthlyChart] = React.useState<{ month: string; count: number }[]>([]);
  const [hasData, setHasData] = React.useState(false);

  React.useEffect(() => {
    async function loadAnalytics() {
      try {
        const latestBackup = await db.backups.orderBy('id').last();
        if (!latestBackup || !latestBackup.id) return;

        const items = await db.contentItems.where('backupId').equals(latestBackup.id).toArray();
        if (items.length === 0) return;

        setHasData(true);

        let withCaption = 0;
        let withTimestamp = 0;
        let withCreator = 0;
        let withHashtags = 0;
        let duplicates = 0;

        const creatorMap: Record<string, number> = {};
        const tagMap: Record<string, number> = {};
        const monthMap: Record<string, number> = {};

        for (const item of items) {
          if (item.caption) withCaption++;
          if (item.savedAt) {
            withTimestamp++;
            const m = item.savedAt.slice(0, 7);
            monthMap[m] = (monthMap[m] || 0) + 1;
          }
          if (item.creatorUsername) {
            withCreator++;
            creatorMap[item.creatorUsername] = (creatorMap[item.creatorUsername] || 0) + 1;
          }
          if (item.hashtags && item.hashtags.length > 0) {
            withHashtags++;
            for (const t of item.hashtags) {
              tagMap[t] = (tagMap[t] || 0) + 1;
            }
          }
          if (item.isDuplicate) duplicates++;
        }

        setDataStats({
          total: items.length,
          withCaption,
          withTimestamp,
          withCreator,
          withHashtags,
          duplicates,
        });

        setCreatorsChart(
          Object.entries(creatorMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, count]) => ({ name, count }))
        );

        setTagsChart(
          Object.entries(tagMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, count]) => ({ name: `#${name}`, count }))
        );

        setMonthlyChart(
          Object.entries(monthMap)
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-12)
            .map(([month, count]) => ({ month, count }))
        );
      } catch (err) {
        console.error('Failed to load analytics:', err);
      }
    }
    loadAnalytics();
  }, []);

  if (!hasData) {
    return (
      <EmptyState
        title="No Analytics Available"
        description="Upload an Instagram backup first to see deep-dive visualizations and data quality reports."
      />
    );
  }

  const qualityScore = Math.round(
    ((dataStats.withCaption + dataStats.withCreator + dataStats.withTimestamp) /
      (dataStats.total * 3 || 1)) *
      100
  );

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-violet-400" />
          <span>Deep Dive Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Quantitative statistics and data quality metrics from your Instagram export
        </p>
      </div>

      {/* Data Quality Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <Card className="p-4 border-[#232334] bg-[#13131e]">
          <p className="text-[11px] text-slate-400 uppercase font-medium">Quality Score</p>
          <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">{qualityScore}%</p>
        </Card>
        <Card className="p-4 border-[#232334] bg-[#13131e]">
          <p className="text-[11px] text-slate-400 uppercase font-medium">With Creator</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {Math.round((dataStats.withCreator / (dataStats.total || 1)) * 100)}%
          </p>
        </Card>
        <Card className="p-4 border-[#232334] bg-[#13131e]">
          <p className="text-[11px] text-slate-400 uppercase font-medium">With Timestamp</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {Math.round((dataStats.withTimestamp / (dataStats.total || 1)) * 100)}%
          </p>
        </Card>
        <Card className="p-4 border-[#232334] bg-[#13131e]">
          <p className="text-[11px] text-slate-400 uppercase font-medium">With Caption</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {Math.round((dataStats.withCaption / (dataStats.total || 1)) * 100)}%
          </p>
        </Card>
        <Card className="p-4 border-[#232334] bg-[#13131e]">
          <p className="text-[11px] text-slate-400 uppercase font-medium">With Hashtags</p>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {Math.round((dataStats.withHashtags / (dataStats.total || 1)) * 100)}%
          </p>
        </Card>
        <Card className="p-4 border-[#232334] bg-[#13131e]">
          <p className="text-[11px] text-slate-400 uppercase font-medium">Duplicate Rate</p>
          <p className="text-2xl font-bold font-mono text-amber-400 mt-1">
            {Math.round((dataStats.duplicates / (dataStats.total || 1)) * 100)}%
          </p>
        </Card>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-[#232334] bg-[#13131e]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Creators Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={creatorsChart} layout="vertical" margin={{ left: 30, right: 20 }}>
                <XAxis type="number" stroke="#64748b" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#cbd5e1" fontSize={11} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181826', borderColor: '#2e2e42', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[#232334] bg-[#13131e]">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Saved Hashtags</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tagsChart} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181826', borderColor: '#2e2e42', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-[#232334] bg-[#13131e] lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Monthly Saving Activity Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyChart} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <XAxis dataKey="month" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#181826', borderColor: '#2e2e42', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

