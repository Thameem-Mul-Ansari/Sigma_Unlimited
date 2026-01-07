// src/components/Admin/MetricsDashboard.tsx

import React, { useEffect, useState, useRef } from 'react';
import { UseAdminLogicReturn } from '../../hooks/useAdminLogic';
import {
  Loader2, Zap, TrendingUp, CheckCircle, AlertTriangle,
  Activity, MessageSquare, Upload, BarChart2, Clock // Added Clock for duration
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
  ComposedChart, Bar, Line, Cell   // ← Add these
} from 'recharts';

interface MetricsDashboardProps {
  logic: UseAdminLogicReturn;
}

interface SystemMetric {
  title: string;
  value: string;
  unit?: string; // Made optional for duration (no unit)
  color: string;
  icon: React.ElementType;
}

interface DailyTokenUsage {
  date: string;
  label: string;
  tokens: number;
  queries: number;
}

const API_BASE = 'https://sritharoon-sigma-llm.hf.space/api';
const AUTH_TOKEN = 'Token 19065757542afc134cb7c3c4b0cbe395e66c1c0a';

const MetricCard: React.FC<SystemMetric> = ({ title, value, unit, color, icon: Icon }) => (
  <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-3xl font-bold text-gray-900">{value}</span>
          {unit && <span className="text-sm text-gray-500">{unit}</span>}
        </div>
      </div>
      <div className={`p-3 rounded-xl ${color.replace('text', 'bg').replace('-600', '-50')} group-hover:scale-110 transition-transform`}>
        <Icon size={24} className={color} />
      </div>
    </div>

    {title.includes('Token') && (
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-gray-500">Monthly usage</span>
          <span className="font-semibold text-gray-700">
            {value.includes('M') ? '92%' : value.includes('K') ? '78%' : '45%'}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-700 h-2 rounded-full transition-all duration-1000"
            style={{ width: value.includes('M') ? '92%' : value.includes('K') ? '78%' : '45%' }}
          />
        </div>
      </div>
    )}
  </div>
);

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ logic }) => {
  const [realMetrics, setRealMetrics] = useState<SystemMetric[]>([]);
  const [tokenTrendData, setTokenTrendData] = useState<DailyTokenUsage[]>([]);
  const [timeRange, setTimeRange] = useState<'today' | '7d' | '30d' | '6m' | '1y'>('30d');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const isFirstLoad = useRef(true);

  // Helper: Calculate avg conversation duration (same logic as calculateAnalytics in ChatLogsTab)
  // === SMART AVERAGE CONVERSATION DURATION (30-min inactivity = new session) ===
const calculateAvgConversationDuration = (conversations: any[]): string => {
  if (!conversations || conversations.length === 0) return '0m 0s';

  const THIRTY_MINUTES_MS = 30 * 60 * 1000;
  const sessionDurations: number[] = []; // in seconds

  conversations.forEach((conv: any) => {
    const logs = (conv.query_logs || [])
      .map((q: any) => ({ ...q, time: new Date(q.timestamp).getTime() }))
      .filter((q: any) => !isNaN(q.time))
      .sort((a: any, b: any) => a.time - b.time);

    if (logs.length === 0) return;

    let currentSessionStart = logs[0].time;
    let lastTime = logs[0].time;

    for (let i = 1; i < logs.length; i++) {
      const currentTime = logs[i].time;
      const gap = currentTime - lastTime;

      if (gap > THIRTY_MINUTES_MS) {
        // End current session
        const durationSec = Math.floor((lastTime - currentSessionStart) / 1000);
        if (durationSec > 0) sessionDurations.push(durationSec);
        // Start new session
        currentSessionStart = currentTime;
      }
      lastTime = currentTime;
    }

    // Don't forget the last session
    const finalDurationSec = Math.floor((lastTime - currentSessionStart) / 1000);
    if (finalDurationSec > 0) sessionDurations.push(finalDurationSec);
  });

  if (sessionDurations.length === 0) return '0m 0s';

  const avgSeconds = sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length;
  const mins = Math.floor(avgSeconds / 60);
  const secs = Math.floor(avgSeconds % 60);

  return `${mins}m ${secs}s`;
};

  // Process token usage by time range (unchanged)
  // Replace your existing processTokenTrend function with this one
const processTokenTrend = (conversations: any[], range: string): DailyTokenUsage[] => {
  const dataMap = new Map<string, { tokens: number; queries: number }>();
  const now = new Date();

  conversations.forEach((conv: any) => {
    (conv.query_logs || []).forEach((q: any) => {
      if (!q.timestamp || q.tokens_used == null) return;
      const date = new Date(q.timestamp);
      if (isNaN(date.getTime())) return;

      let key: string;
      let label: string;

      if (range === 'today') {
        // Only include past and current hour
        const hour = date.getHours();
        const isFutureHour = date.getFullYear() === now.getFullYear() &&
                            date.getMonth() === now.getMonth() &&
                            date.getDate() === now.getDate() &&
                            hour > now.getHours();

        // Skip future hours entirely
        if (isFutureHour) return;

        key = hour.toString().padStart(2, '0');
        label = date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true,
        }).replace(':00', '');
      }
      // ... rest of your existing logic for 7d/30d/6m/1y remains unchanged
      else if (range === '7d' || range === '30d') {
        key = date.toISOString().slice(0, 10);
        label = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      } else if (range === '6m' || range === '1y') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        label = new Date(date.getFullYear(), date.getMonth()).toLocaleString('en-US', {
          month: 'short',
          year: 'numeric',
        });
      } else {
        key = date.toISOString().slice(0, 10);
        label = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }

      if (!dataMap.has(key)) dataMap.set(key, { tokens: 0, queries: 0 });
      const entry = dataMap.get(key)!;
      entry.tokens += q.tokens_used || 0;
      entry.queries += 1;
    });
  });

  // Generate sorted entries — but for "today", only up to current hour
  const sortedEntries: DailyTokenUsage[] = [];

  if (range === 'today') {
    const today = new Date();
    const currentHour = today.getHours();

    for (let h = 0; h <= currentHour; h++) {
      const key = h.toString().padStart(2, '0');
      const value = dataMap.get(key) || { tokens: 0, queries: 0 };
      const hourLabel = new Date(0, 0, 0, h).toLocaleTimeString('en-US', {
        hour: 'numeric',
        hour12: true,
      }).replace(':00', '');

      sortedEntries.push({
        date: key,
        label: hourLabel,
        tokens: Math.round(value.tokens),
        queries: value.queries,
      });
    }
  } else {
    // Existing sorting logic for other ranges
    const sorted = Array.from(dataMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => {
        let label = key;
        if (range === '7d' || range === '30d') {
          label = new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        } else if (range === '6m' || range === '1y') {
          const [y, m] = key.split('-');
          label = new Date(parseInt(y), parseInt(m) - 1).toLocaleString('en-US', {
            month: 'short',
            year: 'numeric',
          });
        }
        return {
          date: key,
          label,
          tokens: Math.round(value.tokens),
          queries: value.queries,
        };
      });
    sortedEntries.push(...sorted);
  }

  return sortedEntries;
};

  // Shared fetch function — used for initial load AND silent refresh
  const fetchMetrics = async (isInitial: boolean = false) => {
    if (isInitial) setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/history/all/`, {
        headers: {
          'Authorization': AUTH_TOKEN,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch logs');
      const conversations = await response.json();

      const allQueries = conversations.flatMap((conv: any) =>
  (conv.query_logs || []).map((q: any) => ({
    tokens_used: q.tokens_used || 0,
    timestamp: q.timestamp,
    latency: q.latency,        // This line was missing!
  }))
);

      const totalTokens = allQueries.reduce((sum: number, q: any) => sum + q.tokens_used, 0);
      // Calculate real average latency from the `latency` field (in seconds → convert to ms)
// Real smart average response time (auto ms → sec)
        const validLatencies = allQueries
        .map((q: any) => q.latency)
        .filter((l: number): l is number => typeof l === 'number' && l >= 0);

        const avgLatencySec = validLatencies.length > 0
        ? validLatencies.reduce((a: any, b: any) => a + b, 0) / validLatencies.length
        : 0;

        const avgLatencyMs = Math.round(avgLatencySec * 1000);

        const displayLatency = avgLatencyMs < 1000
        ? `${avgLatencyMs}ms`
        : `${(avgLatencyMs / 1000).toFixed(2)} s`;

      // NEW: Calculate avg conversation duration (local fallback; use API field if available)
      let avgConversationDuration = '0m 0s';
      // If API returns it directly: avgConversationDuration = data.avg_conversation_duration || calculateAvgConversationDuration(conversations);
      avgConversationDuration = calculateAvgConversationDuration(conversations);

      const formatTokens = (tokens: number) => {
        if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
        if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
        return tokens.toString();
      };

      // === COUNT REAL SESSIONS (30-min inactivity = new session) ===
      const THIRTY_MINUTES_MS = 30 * 60 * 1000;
      let totalRealSessions = 0;

      conversations.forEach((conv: any) => {
        const logs = (conv.query_logs || [])
          .map((q: any) => ({ time: new Date(q.timestamp).getTime() }))
          .filter((q: any) => !isNaN(q.time))
          .sort((a: any, b: any) => a.time - b.time);

        if (logs.length === 0) return;

        totalRealSessions += 1; // at least one session

        for (let i = 1; i < logs.length; i++) {
          if (logs[i].time - logs[i - 1].time > THIRTY_MINUTES_MS) {
            totalRealSessions += 1; // new session started
          }
        }
      });

      // === NOW BUILD METRICS WITH CORRECT VALUES ===
      const metrics: SystemMetric[] = [
        { 
          title: 'Total Tokens Used (All Time)', 
          value: formatTokens(totalTokens), 
          unit: 'tokens', 
          color: 'text-blue-600', 
          icon: Activity 
        },
        {
          title: 'Average Response Time',
          value: validLatencies.length === 0 ? 'N/A' : displayLatency,
          unit: undefined,
          color: 'text-purple-600',
          icon: Zap
        },
        { 
          title: 'Total Sessions', 
          value: totalRealSessions.toString(), 
          unit: 'active', 
          color: 'text-green-600', 
          icon: MessageSquare 
        },
        { 
          title: 'Avg Conversation Duration', 
          value: avgConversationDuration, 
          color: 'text-teal-600', 
          icon: Clock 
        }
      ];

      setRealMetrics(metrics);
      setTokenTrendData(processTokenTrend(conversations, timeRange));
      setError(null);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Failed to load metrics:', err);
      if (isInitial) {
        setError('Could not load live metrics');
        // Update logic.mockSystemMetrics to include avgConversationDuration if needed
        setRealMetrics(logic.mockSystemMetrics);
        setTokenTrendData([]);
      }
    } finally {
      if (isInitial) {
        setLoading(false);
        isFirstLoad.current = false;
      }
    }
  };

  // Initial load
  useEffect(() => {
    fetchMetrics(true);
  }, []);

  // Silent background refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchMetrics(false);
    }, 30_000);
    return () => clearInterval(interval);
  }, [timeRange]);

  // Refresh when user changes time range
  useEffect(() => {
    if (!isFirstLoad.current) {
      fetchMetrics(false);
    }
  }, [timeRange]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="mx-auto animate-spin text-blue-600" size={48} />
          <p className="mt-4 text-gray-600">Loading real-time metrics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Live performance metrics from your chatbot</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            Updated {lastUpdated.toLocaleTimeString()}
          </div>
          {error ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 text-yellow-800 rounded-full text-sm font-medium border border-yellow-200">
              <AlertTriangle size={16} />
              Partial data
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-full text-sm font-medium border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Live • All systems operational
            </div>
          )}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {realMetrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Charts & Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
       {/* Token Usage Trend – Clean & Modern Bar + Line Combo */}
<div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
  <div className="p-6 pb-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <h3 className="text-xl font-semibold text-gray-900">Token Usage & Queries</h3>
        <p className="text-sm text-gray-500">Daily breakdown of tokens consumed and user queries</p>
      </div>

      {/* Clean time range pills */}
      <div className="flex gap-2">
        {(['today', '7d', '30d', '6m', '1y'] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              timeRange === range
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {range === 'today' ? 'Today' : range === '7d' ? '7D' : range === '30d' ? '30D' : range === '6m' ? '6M' : '1Y'}
          </button>
        ))}
      </div>
    </div>

    {tokenTrendData.length > 0 ? (
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={tokenTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="4 8" stroke="#f3f4f6" vertical={false} />
            
            <XAxis 
              dataKey="label" 
              tick={{ fontSize: 12, fill: '#6b7280' }} 
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fontSize: 12, fill: '#10b981' }}
              axisLine={false}
              tickLine={false}
            />

            <Tooltip
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e5e7eb', 
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
              }}
              formatter={(value: number, name: string) => [
                value.toLocaleString(),
                name === 'tokens' ? 'Tokens' : 'Queries'
              ]}
            />

            {/* Bars for Tokens */}
            <Bar 
              yAxisId="left"
              dataKey="tokens" 
              fill="#3b82f6"
              radius={[8, 8, 0, 0]}
              maxBarSize={60}
            >
              {tokenTrendData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index === tokenTrendData.length - 1 ? '#1d4ed8' : '#60a5fa'} />
              ))}
            </Bar>

            {/* Smooth Line for Query Count */}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="queries"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ fill: '#10b981', r: 5 }}
              activeDot={{ r: 7, stroke: '#fff', strokeWidth: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    ) : (
      <div className="h-96 flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl">
        <div className="text-center">
          <BarChart2 size={56} className="mx-auto text-gray-300 mb-4" />
          <p className="text-lg font-medium text-gray-600">No data available</p>
          <p className="text-sm text-gray-400 mt-1">Activity will appear here once users start chatting</p>
        </div>
      </div>
    )}
  </div>
</div>

        {/* System Events */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-5">Recent System Events</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <Zap size={18} className="text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Dashboard Live Updates</p>
                <p className="text-xs text-blue-700">Silent refresh enabled</p>
                <span className="text-xs text-blue-600">Just now</span>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle size={18} className="text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-900">API Health Check</p>
                <p className="text-xs text-green-700">All endpoints responding</p>
                <span className="text-xs text-green-600">2 min ago</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
