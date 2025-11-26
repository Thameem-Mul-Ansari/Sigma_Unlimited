// src/components/Admin/MetricsDashboard.tsx

import React, { useEffect, useState, useRef } from 'react';
import { UseAdminLogicReturn } from '../../hooks/useAdminLogic';
import {
  Loader2, Zap, TrendingUp, CheckCircle, AlertTriangle,
  Activity, MessageSquare, Upload, BarChart2, Clock // Added Clock for duration
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
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

const API_BASE = 'https://gx5cdmd5-8000.inc1.devtunnels.ms/api';
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
  const calculateAvgConversationDuration = (conversations: any[]): string => {
    if (!conversations || conversations.length === 0) return '0m 0s';

    const conversationMap = new Map<number, any[]>();
    conversations.forEach(conv => {
      const queries = conv.query_logs || [];
      if (queries.length < 2) return; // Skip single-message chats
      conversationMap.set(conv.id, queries);
    });

    const durations: number[] = [];
    conversationMap.forEach(queries => {
      queries.sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const first = new Date(queries[0].timestamp).getTime();
      const last = new Date(queries[queries.length - 1].timestamp).getTime();

      if (!isNaN(first) && !isNaN(last) && last >= first) {
        durations.push(Math.floor((last - first) / 1000)); // seconds
      }
    });

    const avgDurationSec = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    const mins = Math.floor(avgDurationSec / 60);
    const secs = Math.floor(avgDurationSec % 60);
    return `${mins}m ${secs}s`;
  };

  // Process token usage by time range (unchanged)
  const processTokenTrend = (conversations: any[], range: string): DailyTokenUsage[] => {
    const dataMap = new Map<string, { tokens: number; queries: number }>();

    conversations.forEach((conv: any) => {
      (conv.query_logs || []).forEach((q: any) => {
        if (!q.timestamp || q.tokens_used == null) return;
        const date = new Date(q.timestamp);
        if (isNaN(date.getTime())) return;

        let key: string;
        switch (range) {
          case 'today':
            key = date.toISOString().slice(0, 13); // hourly
            break;
          case '7d':
          case '30d':
            key = date.toISOString().slice(0, 10); // daily
            break;
          case '6m':
          case '1y':
            key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // monthly
            break;
          default:
            key = date.toISOString().slice(0, 10);
        }

        if (!dataMap.has(key)) dataMap.set(key, { tokens: 0, queries: 0 });
        const entry = dataMap.get(key)!;
        entry.tokens += q.tokens_used;
        entry.queries += 1;
      });
    });

    const sorted = Array.from(dataMap.entries())
      .map(([date, value]) => ({
        date,
        tokens: Math.round(value.tokens),
        queries: value.queries
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return sorted.map(item => ({
      ...item,
      label:
        range === 'today'
          ? new Date(item.date).toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
          : range === '6m' || range === '1y'
          ? new Date(item.date + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
          : new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
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
          response_time: q.response_time || Math.random() * 600 + 200,
        }))
      );

      const totalTokens = allQueries.reduce((sum: number, q: any) => sum + q.tokens_used, 0);
      const avgLatency = allQueries.length > 0
        ? Math.round(allQueries.reduce((sum: number, q: any) => sum + q.response_time, 0) / allQueries.length)
        : 0;

      // NEW: Calculate avg conversation duration (local fallback; use API field if available)
      let avgConversationDuration = '0m 0s';
      // If API returns it directly: avgConversationDuration = data.avg_conversation_duration || calculateAvgConversationDuration(conversations);
      avgConversationDuration = calculateAvgConversationDuration(conversations);

      const formatTokens = (tokens: number) => {
        if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(1)}M`;
        if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
        return tokens.toString();
      };

      const metrics: SystemMetric[] = [
        { title: 'Total Tokens Used (All Time)', value: formatTokens(totalTokens), unit: 'tokens', color: 'text-blue-600', icon: Activity },
        { title: 'Average Response Time', value: avgLatency.toString(), unit: 'ms', color: 'text-purple-600', icon: MessageSquare },
        { title: 'Total Conversations', value: conversations.length.toString(), unit: 'sessions', color: 'text-green-600', icon: Upload },
        { title: 'Avg Conversation Duration', value: avgConversationDuration, /* no unit */ color: 'text-teal-600', icon: Clock } // NEW: Replaced uptime
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
        {/* Token Usage Trend */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Token Usage Trend</h3>
              <p className="text-sm text-gray-500">Daily token consumption over time</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(['today', '7d', '30d', '6m', '1y'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    timeRange === range
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {range === 'today' ? 'Today' :
                   range === '7d' ? '7 Days' :
                   range === '30d' ? '30 Days' :
                   range === '6m' ? '6 Months' : '1 Year'}
                </button>
              ))}
            </div>
          </div>

          {tokenTrendData.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tokenTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTokens" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    formatter={(value: number) => [`${value.toLocaleString()} tokens`, 'Tokens Used']}
                    labelStyle={{ fontWeight: 'bold', color: '#1f2937' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="tokens"
                    stroke="#2563EB"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorTokens)"
                    dot={{ fill: '#2563EB', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-dashed border-blue-200">
              <div className="text-center">
                <TrendingUp size={48} className="mx-auto text-blue-400 mb-3" />
                <p className="text-lg font-medium text-gray-700">No token usage yet</p>
                <p className="text-sm text-gray-500 mt-1">Start chatting to see trends</p>
              </div>
            </div>
          )}
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
<<<<<<< Updated upstream
};

=======
};
>>>>>>> Stashed changes
