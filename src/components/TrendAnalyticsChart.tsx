import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  Calendar,
  Sparkles,
  Smile,
  Activity,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Info
} from 'lucide-react';
import { JournalEntry } from '../types';

interface TrendAnalyticsChartProps {
  entries: JournalEntry[];
  isOpen?: boolean;
  onToggleOpen?: () => void;
}

type ChartMetric = 'frequency' | 'mood' | 'turns';

interface DayDataPoint {
  dateKey: string;
  displayDate: string;
  fullDate: string;
  entriesCount: number;
  turnsCount: number;
  wordsCount: number;
  moodScore: number | null;
  dominantCategory: string;
}

export const TrendAnalyticsChart: React.FC<TrendAnalyticsChartProps> = ({
  entries,
  isOpen = true,
  onToggleOpen,
}) => {
  const [metric, setMetric] = useState<ChartMetric>('frequency');
  const [timeRange, setTimeRange] = useState<30 | 14 | 7>(30);

  // Generate chronological timeline
  const chartData = useMemo<DayDataPoint[]>(() => {
    const dataMap: { [key: string]: DayDataPoint } = {};
    const today = new Date();

    for (let i = timeRange - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const fullDate = d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' });

      dataMap[dateKey] = {
        dateKey,
        displayDate,
        fullDate,
        entriesCount: 0,
        turnsCount: 0,
        wordsCount: 0,
        moodScore: null,
        dominantCategory: 'None',
      };
    }

    const categoryMoodWeight: Record<string, number> = {
      Gratitude: 9.0,
      Creative: 8.5,
      Goals: 8.0,
      Brainstorm: 7.5,
      Reflection: 7.0,
      Personal: 6.8,
      Work: 6.2,
    };

    const categoryCountsByDay: Record<string, Record<string, number>> = {};

    entries.forEach((entry) => {
      const entryDate = entry.createdAt ? entry.createdAt.split('T')[0] : '';
      if (dataMap[entryDate]) {
        dataMap[entryDate].entriesCount += 1;

        const turns = entry.turns || [];
        dataMap[entryDate].turnsCount += turns.length;

        const words = turns.reduce(
          (acc, t) => acc + (t.content ? t.content.split(/\s+/).filter(Boolean).length : 0),
          0
        );
        dataMap[entryDate].wordsCount += words;

        if (!categoryCountsByDay[entryDate]) {
          categoryCountsByDay[entryDate] = {};
        }
        const cat = entry.category || 'Reflection';
        categoryCountsByDay[entryDate][cat] = (categoryCountsByDay[entryDate][cat] || 0) + 1;
      }
    });

    Object.keys(dataMap).forEach((dateKey) => {
      const point = dataMap[dateKey];
      const catCounts = categoryCountsByDay[dateKey];

      if (point.entriesCount > 0 && catCounts) {
        let totalWeightedScore = 0;
        let highestCat = 'Reflection';
        let highestCatCount = 0;

        Object.entries(catCounts).forEach(([cat, count]) => {
          const weight = categoryMoodWeight[cat] || 7.0;
          totalWeightedScore += weight * count;
          if (count > highestCatCount) {
            highestCatCount = count;
            highestCat = cat;
          }
        });

        const depthBonus = Math.min(1.0, point.turnsCount * 0.15);
        const rawScore = totalWeightedScore / point.entriesCount + depthBonus;
        point.moodScore = Number(Math.min(10, Math.max(1, rawScore)).toFixed(1));
        point.dominantCategory = highestCat;
      }
    });

    return Object.values(dataMap);
  }, [entries, timeRange]);

  const stats = useMemo(() => {
    const totalEntriesInRange = chartData.reduce((acc, d) => acc + d.entriesCount, 0);
    const totalTurnsInRange = chartData.reduce((acc, d) => acc + d.turnsCount, 0);
    const activeDays = chartData.filter((d) => d.entriesCount > 0).length;

    const daysWithMood = chartData.filter((d) => d.moodScore !== null);
    const avgMood =
      daysWithMood.length > 0
        ? (
            daysWithMood.reduce((acc, d) => acc + (d.moodScore || 0), 0) / daysWithMood.length
          ).toFixed(1)
        : null;

    const peakDay = [...chartData].sort((a, b) => b.entriesCount - a.entriesCount)[0];

    return {
      totalEntriesInRange,
      totalTurnsInRange,
      activeDays,
      consistencyRate: Math.round((activeDays / timeRange) * 100),
      avgMood: avgMood ? `${avgMood} / 10` : 'N/A',
      peakDate: peakDay && peakDay.entriesCount > 0 ? `${peakDay.displayDate} (${peakDay.entriesCount})` : 'None',
    };
  }, [chartData, timeRange]);

  // 3D Glassmorphic Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data: DayDataPoint = payload[0].payload;
      return (
        <div className="bg-[#2C2823]/95 backdrop-blur-md text-[#FBF9F6] px-4 py-3 rounded-2xl border border-white/20 shadow-2xl text-xs font-sans space-y-1.5 min-w-[170px] transform-gpu -translate-y-1">
          <p className="font-serif font-semibold text-xs text-[#EAE4DC] border-b border-white/10 pb-1.5 flex items-center justify-between">
            <span>{data.fullDate}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#8A9A8A]" />
          </p>
          <div className="flex items-center justify-between gap-4 pt-0.5">
            <span className="text-[#A69E94]">Entries Logged:</span>
            <span className="font-bold text-white text-sm">{data.entriesCount}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-[#A69E94]">AI Dialogue Turns:</span>
            <span className="font-medium text-[#8A9A8A]">{data.turnsCount}</span>
          </div>
          {data.moodScore !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-[#A69E94]">Mood Index:</span>
              <span className="font-bold text-amber-300">{data.moodScore} / 10</span>
            </div>
          )}
          {data.dominantCategory !== 'None' && (
            <div className="flex items-center justify-between gap-4 text-[10px] text-[#A69E94] pt-0.5 border-t border-white/10">
              <span>Primary Focus:</span>
              <span className="text-[#FBF9F6] font-medium">{data.dominantCategory}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <section
      id="trend-analytics-section"
      className="glass-panel border-b border-[#E0DBCF]/80 px-4 sm:px-6 py-4 shadow-sm"
    >
      {/* Header Bar with Toggle & Metric Selectors */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#3A352F] text-[#FBF9F6] flex items-center justify-center shadow-md border border-white/15">
            <TrendingUp className="w-4 h-4 text-[#8A9A8A]" />
          </div>
          <div>
            <h3 className="font-serif font-semibold text-sm sm:text-base text-[#3A352F] leading-none flex items-center gap-1.5">
              <span>Past {timeRange}-Day Reflection &amp; Mood Trends</span>
            </h3>
            <p className="text-[11px] text-[#7A7369] font-sans mt-0.5">
              Visualizing journal frequency, conversational depth &amp; emotional balance
            </p>
          </div>
        </div>

        {/* Controls: Metric Switcher & Time Range */}
        <div className="flex flex-wrap items-center gap-2 font-sans">
          {/* Time Range Pills */}
          <div className="inline-flex glass-pill p-1 rounded-xl gap-1">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                id={`trend-range-${days}d`}
                onClick={() => setTimeRange(days as 30 | 14 | 7)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer ${
                  timeRange === days
                    ? 'bg-[#3A352F] text-[#FBF9F6] shadow-sm font-semibold'
                    : 'text-[#7A7369] hover:text-[#3A352F] hover:bg-white/60'
                }`}
              >
                {days}d
              </button>
            ))}
          </div>

          {/* Metric Selector */}
          <div className="inline-flex glass-pill p-1 rounded-xl gap-1">
            <button
              type="button"
              id="trend-metric-frequency"
              onClick={() => setMetric('frequency')}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                metric === 'frequency'
                  ? 'bg-[#3A352F] text-[#FBF9F6] shadow-sm font-semibold'
                  : 'text-[#7A7369] hover:text-[#3A352F] hover:bg-white/60'
              }`}
            >
              <Activity className="w-3 h-3 text-[#8A9A8A]" />
              <span>Entries</span>
            </button>
            <button
              type="button"
              id="trend-metric-mood"
              onClick={() => setMetric('mood')}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                metric === 'mood'
                  ? 'bg-[#3A352F] text-[#FBF9F6] shadow-sm font-semibold'
                  : 'text-[#7A7369] hover:text-[#3A352F] hover:bg-white/60'
              }`}
            >
              <Smile className="w-3 h-3 text-amber-500" />
              <span>Mood Index</span>
            </button>
            <button
              type="button"
              id="trend-metric-turns"
              onClick={() => setMetric('turns')}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                metric === 'turns'
                  ? 'bg-[#3A352F] text-[#FBF9F6] shadow-sm font-semibold'
                  : 'text-[#7A7369] hover:text-[#3A352F] hover:bg-white/60'
              }`}
            >
              <Sparkles className="w-3 h-3 text-[#8A9A8A]" />
              <span>AI Dialogue</span>
            </button>
          </div>

          {onToggleOpen && (
            <button
              type="button"
              onClick={onToggleOpen}
              className="p-1.5 rounded-xl glass-pill text-[#7A7369] hover:text-[#3A352F] hover:bg-white transition-all cursor-pointer shadow-xs"
              title={isOpen ? 'Collapse chart' : 'Expand chart'}
            >
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          )}
        </div>
      </div>

      {/* Chart & Summary Content */}
      {isOpen && (
        <div className="space-y-3.5 animate-in fade-in duration-200">
          {/* 3D Floating Summary Metric Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-sans">
            <div className="glass-card-3d p-3 rounded-2xl">
              <span className="block text-[10px] text-[#7A7369] font-medium">Total Entries ({timeRange}d)</span>
              <span className="font-serif font-bold text-base sm:text-lg text-[#3A352F]">
                {stats.totalEntriesInRange}
              </span>
            </div>
            <div className="glass-card-3d p-3 rounded-2xl">
              <span className="block text-[10px] text-[#7A7369] font-medium">Active Reflection Days</span>
              <span className="font-serif font-bold text-base sm:text-lg text-[#3A352F]">
                {stats.activeDays} / {timeRange}d <span className="text-xs font-sans text-[#8A9A8A]">({stats.consistencyRate}%)</span>
              </span>
            </div>
            <div className="glass-card-3d p-3 rounded-2xl">
              <span className="block text-[10px] text-[#7A7369] font-medium">Avg Mood Valence</span>
              <span className="font-serif font-bold text-base sm:text-lg text-[#8A9A8A]">
                {stats.avgMood}
              </span>
            </div>
            <div className="glass-card-3d p-3 rounded-2xl">
              <span className="block text-[10px] text-[#7A7369] font-medium">AI Dialogue Turns</span>
              <span className="font-serif font-bold text-base sm:text-lg text-[#3A352F]">
                {stats.totalTurnsInRange}
              </span>
            </div>
          </div>

          {/* Responsive Line Chart with Smooth Ambient Gradients */}
          <div className="glass-card-3d p-3.5 rounded-2xl h-48 sm:h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="frequencyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3A352F" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#3A352F" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#D97706" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#D97706" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="turnsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8A9A8A" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8A9A8A" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#E0DBCF" opacity={0.6} />
                <XAxis
                  dataKey="displayDate"
                  tick={{ fill: '#7A7369', fontSize: 10 }}
                  tickLine={{ stroke: '#E0DBCF' }}
                  axisLine={{ stroke: '#E0DBCF' }}
                  interval={timeRange === 30 ? 4 : timeRange === 14 ? 1 : 0}
                />
                <YAxis
                  tick={{ fill: '#7A7369', fontSize: 10 }}
                  tickLine={{ stroke: '#E0DBCF' }}
                  axisLine={{ stroke: '#E0DBCF' }}
                  allowDecimals={false}
                  domain={metric === 'mood' ? [0, 10] : [0, 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />

                {metric === 'frequency' && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="entriesCount"
                      name="Journal Entries"
                      stroke="#3A352F"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#frequencyGradient)"
                      dot={{ fill: '#3A352F', r: 3, strokeWidth: 1 }}
                      activeDot={{ r: 5, fill: '#8A9A8A', stroke: '#3A352F', strokeWidth: 2 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="turnsCount"
                      name="AI Turns"
                      stroke="#8A9A8A"
                      strokeWidth={1.5}
                      strokeDasharray="4 4"
                      dot={{ fill: '#8A9A8A', r: 2 }}
                    />
                  </>
                )}

                {metric === 'mood' && (
                  <Area
                    type="monotone"
                    dataKey="moodScore"
                    name="Mood & Tone Index"
                    stroke="#D97706"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#moodGradient)"
                    connectNulls={true}
                    dot={{ fill: '#D97706', r: 3.5, strokeWidth: 1 }}
                    activeDot={{ r: 6, fill: '#F59E0B', stroke: '#78350F', strokeWidth: 2 }}
                  />
                )}

                {metric === 'turns' && (
                  <Area
                    type="monotone"
                    dataKey="turnsCount"
                    name="AI Conversational Turns"
                    stroke="#8A9A8A"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#turnsGradient)"
                    dot={{ fill: '#8A9A8A', r: 3, strokeWidth: 1 }}
                    activeDot={{ r: 5, fill: '#3A352F', stroke: '#8A9A8A', strokeWidth: 2 }}
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Chart Legend Footnote */}
          <div className="flex items-center justify-between text-[10px] text-[#A69E94] px-1 font-sans">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#8A9A8A]" />
              <span>
                {metric === 'frequency'
                  ? 'Solid line: Daily entries | Dashed sage line: AI conversation turns'
                  : metric === 'mood'
                  ? 'Calculated from category emotional valence, gratitude, and depth (Scale 1-10)'
                  : 'Number of interactive reflection turns exchanged with Gemini AI per day'}
              </span>
            </span>
            <span className="font-medium text-[#7A7369]">Cloud Firestore Synced</span>
          </div>
        </div>
      )}
    </section>
  );
};
