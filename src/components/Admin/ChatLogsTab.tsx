import React, { useState, useEffect, useCallback } from 'react';
import { 
   Eye, TrendingUp, Users, MessageSquare, 
  Clock, Zap, RefreshCw, BarChart3, Activity, AlertCircle, X 
} from 'lucide-react';

interface UserInfo {
  id: number;
  username: string;
  email: string;
}

interface QueryLog {
  prompt: string;
  response: string;
  source_documents?: string[];
  tokens_used: number;
  prompt_tokens: number;
  completion_tokens: number;
  total_cost: number;
  timestamp: string;
  latency: number;
}

interface ConversationLog {
  id: number;
  title: string;
  created_at: string;
  user: UserInfo;
  query_logs: QueryLog[];
}

interface EnrichedQueryLog extends QueryLog {
  conversation_id: number;
  user_id: number;
  username: string;
  tokens: number;
  duration: string;
  firstQuery: string;
  id: string;
}

interface AdminLogic {
  activeTab: string;
}

interface ChatLogsTabProps {
  logic: AdminLogic;
}

interface SessionRow extends EnrichedQueryLog {
  allLogs: EnrichedQueryLog[];
  queryCount: number;
  totalTokens: number;
  startTime: string;
  endTime: string;
}

const API_BASE = 'https://sritharoon-sigma-llm.hf.space/api';
const AUTH_TOKEN = localStorage.getItem('authToken');
const COST_PER_TOKEN = 0.00002;

const formatTimestamp = (timestamp: string | undefined): string => {
  if (!timestamp) return 'N/A';
  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString('en-US', {
      year: 'numeric', month: '2-digit', day: '2-digit', 
      hour: '2-digit', minute: '2-digit'
    });
  } catch {
    return 'Invalid Date';
  }
};

const ViewDetailsModal: React.FC<{ 
  log: SessionRow | null; 
  onClose: () => void 
}> = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b flex justify-between items-center sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Eye size={20} className="text-blue-600" />
            Session #{log.conversation_id} – Full Conversation ({log.allLogs.length} messages)
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
            <div><span className="font-semibold">User:</span> {log.username}</div>
            <div><span className="font-semibold">Started:</span> {formatTimestamp(log.startTime)}</div>
            <div><span className="font-semibold">Messages:</span> {log.allLogs.length}</div>
            <div><span className="font-semibold">Total Tokens:</span> {log.totalTokens}</div>
            <div><span className="font-semibold">Ended:</span> {formatTimestamp(log.endTime)}</div>
            <div><span className="font-semibold">Cost:</span> ${(log.totalTokens * COST_PER_TOKEN).toFixed(6)}</div>
          </div>

          <div className="space-y-4">
            {log.allLogs.map((msg, idx) => (
              <div key={idx} className="border-l-4 border-blue-500 pl-4 py-3 bg-gray-50 rounded-r-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-medium text-blue-700">Query #{idx + 1}</span>
                  <span className="text-xs text-gray-500">{formatTimestamp(msg.timestamp)}</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">User:</p>
                    <p className="text-sm bg-white p-3 rounded-lg border">{msg.prompt || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-1">Assistant:</p>
                    <p className="text-sm bg-purple-50 p-3 rounded-lg border border-purple-200 whitespace-pre-wrap">
                      {msg.response || 'No response'}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    Tokens: {msg.tokens_used} | Latency: {msg.latency ? `${msg.latency}s` : 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ChatLogsTab: React.FC<ChatLogsTabProps> = ({ logic }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [chatLogs, setChatLogs] = useState<SessionRow[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<SessionRow | null>(null);

  const [analytics, setAnalytics] = useState({
    totalSessions: 0,
    totalTokens: 0,
    avgTokensPerSession: 0,
    activeUsers: 0,
    totalQueries: 0,
    avgResponseTime: 0,
    avgConversationDuration: '0m 0s'
  });

  const calculateAnalytics = useCallback((logs: EnrichedQueryLog[]) => {
    if (!logs || logs.length === 0) {
      setAnalytics({
        totalSessions: 0,
        totalTokens: 0,
        avgTokensPerSession: 0,
        activeUsers: 0,
        totalQueries: 0,
        avgResponseTime: 0,
        avgConversationDuration: '0m 0s'
      });
      return;
    }

    const THIRTY_MINUTES_MS = 30 * 60 * 1000;
    let realSessionCount = 0;
    let totalTokens = 0;
    let totalQueries = 0;
    const sessionDurations: number[] = [];
    const users = new Set<string>();

    const conversationGroups = new Map<number, EnrichedQueryLog[]>();
    logs.forEach(log => {
      if (!conversationGroups.has(log.conversation_id)) {
        conversationGroups.set(log.conversation_id, []);
      }
      conversationGroups.get(log.conversation_id)!.push(log);
    });

    conversationGroups.forEach(groupLogs => {
      const sorted = groupLogs
        .map(q => ({ ...q, time: new Date(q.timestamp).getTime() }))
        .filter(q => !isNaN(q.time))
        .sort((a, b) => a.time - b.time);

      if (sorted.length === 0) return;

      totalQueries += sorted.length;
      sorted.forEach(q => {
        totalTokens += q.tokens_used || 0;
        users.add(q.username);
      });

      let sessionStart = sorted[0].time;
      let lastTime = sorted[0].time;

      for (let i = 1; i < sorted.length; i++) {
        const currentTime = sorted[i].time;
        const gap = currentTime - lastTime;

        if (gap > THIRTY_MINUTES_MS) {
          const durationSec = Math.floor((lastTime - sessionStart) / 1000);
          if (durationSec > 0) sessionDurations.push(durationSec);
          realSessionCount++;
          sessionStart = currentTime;
        }
        lastTime = currentTime;
      }

      const finalDurationSec = Math.floor((lastTime - sessionStart) / 1000);
      if (finalDurationSec > 0) sessionDurations.push(finalDurationSec);
      realSessionCount++;
    });

    const avgDurationSec = sessionDurations.length > 0
      ? sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length
      : 0;
    const mins = Math.floor(avgDurationSec / 60);
    const secs = Math.floor(avgDurationSec % 60);
    const avgConversationDuration = `${mins}m ${secs}s`;

    const validLatencies = logs
      .map(log => log.latency)
      .filter((l): l is number => typeof l === 'number' && l >= 0);

    const avgLatencyMs = validLatencies.length > 0
      ? Math.round(
          validLatencies.reduce((sum, lat) => sum + lat, 0) * 1000 / validLatencies.length
        )
      : 0;

    const avgResponseTimeDisplay = avgLatencyMs === 0
      ? 0
      : avgLatencyMs < 1000
        ? avgLatencyMs / 1000
        : avgLatencyMs / 1000;

    setAnalytics({
      totalSessions: realSessionCount,
      totalTokens,
      avgTokensPerSession: realSessionCount > 0 ? Math.round(totalTokens / realSessionCount) : 0,
      activeUsers: users.size,
      totalQueries,
      avgResponseTime: avgResponseTimeDisplay,
      avgConversationDuration
    });
  }, []);

  const fetchChatHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/history/all/`, {
        method: 'GET',
        headers: {
          'Authorization': AUTH_TOKEN || '',
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ConversationLog[] = await response.json();
      
      const flattenedLogs: EnrichedQueryLog[] = data.flatMap(conversation => {
        const { id: conversation_id, user } = conversation;

        return (conversation.query_logs || []).map((queryLog, index) => ({
          ...queryLog,
          id: `${conversation_id}-${queryLog.timestamp}-${index}`,
          conversation_id,
          user_id: user.id,
          username: user.username,
          tokens: queryLog.tokens_used,
          duration: "N/A",
          firstQuery:
            (queryLog.prompt || '').substring(0, 80) +
            ((queryLog.prompt || '').length > 80 ? '...' : ''),
        }));
      });

      const convMap = new Map<number, EnrichedQueryLog[]>();
      flattenedLogs.forEach(log => {
        if (!convMap.has(log.conversation_id)) convMap.set(log.conversation_id, []);
        convMap.get(log.conversation_id)!.push(log);
      });

      const THIRTY_MINUTES_MS = 30 * 60 * 1000;
      const allSessions: SessionRow[] = [];

      convMap.forEach((messages, convId) => {
        const sorted = messages
          .map(m => ({ ...m, ts: new Date(m.timestamp).getTime() }))
          .filter(m => !isNaN(m.ts))
          .sort((a, b) => a.ts - b.ts);

        if (sorted.length === 0) return;

        let currentSession: SessionRow | null = null;

        sorted.forEach(msg => {
          if (!currentSession) {
            currentSession = {
              ...msg,
              allLogs: [msg],
              queryCount: 1,
              totalTokens: msg.tokens_used || 0,
              startTime: msg.timestamp,
              endTime: msg.timestamp,
              duration: '0s',
              firstQuery: (msg.prompt || '').substring(0, 80) + '...',
            };
          } else {
            const gap = msg.ts - new Date(currentSession.endTime).getTime();

            if (gap < THIRTY_MINUTES_MS) {
              currentSession.allLogs.push(msg);
              currentSession.queryCount += 1;
              currentSession.totalTokens += msg.tokens_used || 0;
              currentSession.endTime = msg.timestamp;
            } else {
              allSessions.push(currentSession);
              currentSession = {
                ...msg,
                allLogs: [msg],
                queryCount: 1,
                totalTokens: msg.tokens_used || 0,
                startTime: msg.timestamp,
                endTime: msg.timestamp,
                duration: '0s',
                firstQuery: (msg.prompt || '').substring(0, 80) + '...',
              };
            }
          }

          if (currentSession) {
            const ms = new Date(currentSession.endTime).getTime() - new Date(currentSession.startTime).getTime();
            const secs = Math.floor(ms / 1000);
            const h = Math.floor(secs / 3600);
            const m = Math.floor((secs % 3600) / 60);
            const s = secs % 60;
            currentSession.duration = h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;
          }
        });

        if (currentSession) allSessions.push(currentSession);
      });

      allSessions.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

      setChatLogs(allSessions);
      setFilteredLogs(allSessions);
      calculateAnalytics(flattenedLogs);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch chat history');
      console.error('Error fetching chat history:', err);
    } finally {
      setLoading(false);
    }
  }, [calculateAnalytics]);

  useEffect(() => {
    fetchChatHistory();
  }, [fetchChatHistory]);

  useEffect(() => {
    setFilteredLogs(chatLogs);
  }, [chatLogs]);

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100">
      <ViewDetailsModal 
        log={selectedLog} 
        onClose={() => setSelectedLog(null)} 
      />
      
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Chat Logs & Analytics</h1>
              <p className="text-sm text-gray-500 mt-1">Monitor chatbot usage and performance metrics</p>
            </div>
            <button 
              onClick={fetchChatHistory}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="text-red-600" size={20} />
            <div>
              <p className="text-sm font-medium text-red-900">Error loading data</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'overview'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 size={18} />
              Overview
            </div>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'logs'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare size={18} />
              Chat Logs
            </div>
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'analytics'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity size={18} />
              Analytics
            </div>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Sessions</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalSessions}</p>
                    <p className="text-xs text-gray-500 mt-2">Unique conversations</p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl">
                    <MessageSquare className="text-blue-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Tokens Used</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalTokens.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-2">~{analytics.avgTokensPerSession} avg per session</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl">
                    <Zap className="text-purple-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Active Users</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.activeUsers}</p>
                    <p className="text-xs text-gray-500 mt-2">Total unique users</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-xl">
                    <Users className="text-green-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Queries</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.totalQueries}</p>
                    <p className="text-xs text-gray-500 mt-2">Across all conversations</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-xl">
                    <MessageSquare className="text-orange-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Avg Response Time</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {analytics.avgResponseTime === 0 
                        ? 'N/A' 
                        : analytics.avgResponseTime < 1
                          ? `${(analytics.avgResponseTime * 1000).toFixed(0)}ms`
                          : `${analytics.avgResponseTime.toFixed(2)}s`
                      }
                    </p>
                    <p className="text-xs text-gray-500 mt-2">Estimated average</p>
                  </div>
                  <div className="p-3 bg-indigo-50 rounded-xl">
                    <Clock className="text-indigo-600" size={24} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Cost Estimate</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">${(analytics.totalTokens * COST_PER_TOKEN).toFixed(4)}</p> 
                    <p className="text-xs text-gray-500 mt-2">Based on token usage</p>
                  </div>
                  <div className="p-3 bg-red-50 rounded-xl">
                    <TrendingUp className="text-red-600" size={24} />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
              {chatLogs.length > 0 ? (
                <div className="space-y-4">
                  {chatLogs.slice(0, 5).map((log) => (
                    <div 
                      key={log.id} 
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 cursor-pointer transition-colors"
                      onClick={() => setSelectedLog(log)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <MessageSquare className="text-blue-600" size={20} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{log.username || 'Unknown User'}</p>
                          <p className="text-sm text-gray-500 truncate max-w-md">{log.firstQuery}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">{log.totalTokens} tokens</p>
                        <p className="text-xs text-gray-400">{formatTimestamp(log.timestamp).split(',')[0]}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No recent activity</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Session</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Timestamp</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Tokens</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Query</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map((session) => (
                      <tr key={session.conversation_id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">#{session.conversation_id}</span>
                          <span className="ml-2 text-xs text-gray-500">({session.queryCount} messages)</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                              {(session.username || 'U').charAt(0).toUpperCase()}
                            </div>
                            <span className="ml-3 text-sm text-gray-900">{session.username || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTimestamp(session.startTime)}
                          <div className="text-xs text-gray-400">
                            → {formatTimestamp(session.endTime).split(',')[1]?.trim()}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock size={14} className="text-gray-400" />
                            {session.duration}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                            {session.totalTokens}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                          <div className="truncate" title={session.firstQuery}>
                            {session.firstQuery}
                          </div>
                          {session.queryCount > 1 && (
                            <span className="text-xs text-gray-500">+ {session.queryCount - 1} more messages</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button 
                            onClick={() => setSelectedLog(session)}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-1"
                            title="View Full Conversation History"
                          >
                            <Eye size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredLogs.length === 0 && !loading && (
                <div className="text-center py-12">
                  <MessageSquare className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500">No chat logs available</p>
                </div>
              )}

              {loading && (
                <div className="text-center py-12">
                  <RefreshCw className="mx-auto text-blue-500 mb-4 animate-spin" size={48} />
                  <p className="text-gray-500">Loading chat logs...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FULL ANALYTICS TAB RESTORED */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Token Usage by User */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Token Usage by User</h3>
              {chatLogs.length > 0 ? (
                <div className="space-y-4">
                  {[...new Set(chatLogs.map(l => l.username))].map((user) => {
                    const userLogs = chatLogs.filter(log => log.username === user);
                    const userTokens = userLogs.reduce((sum, log) => sum + log.totalTokens, 0);
                    const percentage = analytics.totalTokens > 0 ? (userTokens / analytics.totalTokens) * 100 : 0;
                    
                    return (
                      <div key={user}>
                        <div className="flex justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">{user}</span>
                          <span className="text-sm text-gray-600">{userTokens.toLocaleString()} tokens ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div 
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No user data available</p>
              )}
            </div>

            {/* Sessions Over Time & Top Queries */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Sessions Over Time</h3>
                <div className="h-64 flex items-end justify-around gap-2">
                  {chatLogs.length > 0 ? (
                    (() => {
                      const dailyCounts: { [key: string]: number } = {};
                      const last7Days = [];
                      const now = new Date();
                      
                      for (let i = 6; i >= 0; i--) {
                        const date = new Date(now);
                        date.setDate(date.getDate() - i);
                        const dateStr = date.toISOString().split('T')[0];
                        last7Days.push(dateStr);
                        dailyCounts[dateStr] = 0;
                      }
                      
                      const dailySessions = new Map<string, Set<number>>();
                      
                      chatLogs.forEach(log => {
                        const logDate = new Date(log.startTime);
                        if (!isNaN(logDate.getTime())) {
                          const dateStr = logDate.toISOString().split('T')[0];
                          if (dailyCounts[dateStr] !== undefined) {
                            if (!dailySessions.has(dateStr)) {
                              dailySessions.set(dateStr, new Set());
                            }
                            dailySessions.get(dateStr)?.add(log.conversation_id);
                          }
                        }
                      });
                      
                      dailySessions.forEach((sessions, dateStr) => {
                        dailyCounts[dateStr] = sessions.size;
                      });
                      
                      const maxCount = Math.max(...Object.values(dailyCounts), 1);
                      
                      return last7Days.map((dateStr, i) => {
                        const count = dailyCounts[dateStr];
                        const height = (count / maxCount) * 100;
                        const dayLabel = new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' });
                        
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div 
                              className="w-full bg-gradient-to-t from-blue-500 to-blue-300 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-400 cursor-pointer group relative"
                              style={{ height: `${height}%`, minHeight: '20px' }}
                              title={`${count} sessions`}
                            >
                              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                {count} sessions
                              </div>
                            </div>
                            <span className="text-xs text-gray-500">{dayLabel}</span>
                          </div>
                        );
                      });
                    })()
                  ) : (
                    <p className="text-gray-500 m-auto">No data available</p>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Top Queries by Tokens</h3>
                {chatLogs.length > 0 ? (
                  <div className="space-y-3">
                    {[...chatLogs]
                      .sort((a, b) => b.totalTokens - a.totalTokens)
                      .slice(0, 6)
                      .map((log) => (
                        <div 
                          key={log.id} 
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <span className="text-sm font-bold text-gray-400 min-w-[24px]">#{log.conversation_id}</span>
                          <p className="text-sm text-gray-700 flex-1 truncate" title={log.firstQuery}>
                            {log.firstQuery || 'No query text'}
                          </p>
                          <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full whitespace-nowrap">
                            {log.totalTokens} tokens
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No queries available</p>
                )}
              </div>
            </div>

            {/* Query Length Distribution – CORRECT VERSION (All Queries, Not Just First) */}
<div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
  <h3 className="text-lg font-bold text-gray-900 mb-4">Query Length Distribution</h3>
  {chatLogs.length > 0 ? (
    <div className="space-y-4">
      {(() => {
        // Flatten ALL user prompts from ALL messages in ALL sessions
        const allPrompts = chatLogs.flatMap(session => 
          session.allLogs.map(log => log.prompt || '')
        ).filter(prompt => prompt.trim().length > 0);

        const total = allPrompts.length;

        const short = allPrompts.filter(p => p.length < 50).length;
        const medium = allPrompts.filter(p => p.length >= 50 && p.length < 150).length;
        const long = allPrompts.filter(p => p.length >= 150).length;

        const percentShort = total > 0 ? (short / total) * 100 : 0;
        const percentMedium = total > 0 ? (medium / total) * 100 : 0;
        const percentLong = total > 0 ? (long / total) * 100 : 0;

        return (
          <>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Short (&lt;50 chars)</span>
                <span className="text-sm text-gray-600">{short} queries ({percentShort.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${percentShort}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Medium (50–149 chars)</span>
                <span className="text-sm text-gray-600">{medium} queries ({percentMedium.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-yellow-500 to-yellow-400 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${percentMedium}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Long (≥150 chars)</span>
                <span className="text-sm text-gray-600">{long} queries ({percentLong.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-red-500 to-red-400 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${percentLong}%` }}
                />
              </div>
            </div>
          </>
        );
      })()}
    </div>
  ) : (
    <p className="text-center text-gray-500 py-8">No data available</p>
  )}
</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatLogsTab;