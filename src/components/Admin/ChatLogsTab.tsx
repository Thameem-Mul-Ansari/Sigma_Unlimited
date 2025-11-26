import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, ChevronDown, Eye, Download, TrendingUp, Users, MessageSquare, 
  Clock, Zap, Calendar, Filter, RefreshCw, BarChart3, Activity, AlertCircle, X 
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

interface Analytics {
  totalSessions: number;
  totalTokens: number;
  avgTokensPerSession: number;
  activeUsers: number;
  totalQueries: number;
  avgResponseTime: number;
  avgConversationDuration: string; // e.g., "5m 32s"
}

const API_BASE = 'https://gx5cdmd5-8000.inc1.devtunnels.ms/api';
const AUTH_TOKEN = 'Token 19065757542afc134cb7c3c4b0cbe395e66c1c0a';
const COST_PER_TOKEN = 0.00002;

const calculateDuration = (timestamp: string): string => {
  const minutes = Math.floor(Math.random() * 14 + 1);
  const seconds = Math.floor(Math.random() * 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
};

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

const ViewDetailsModal: React.FC<{ log: EnrichedQueryLog | null; onClose: () => void }> = ({ log, onClose }) => {
  if (!log) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-5 border-b flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Eye size={20} className="text-blue-600" />
            Conversation Details (ID: {log.conversation_id})
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 bg-gray-50 p-4 rounded-lg">
            <div><span className="font-semibold text-gray-500">User:</span> {log.username}</div>
            <div><span className="font-semibold text-gray-500">Timestamp:</span> {formatTimestamp(log.timestamp)}</div>
            <div><span className="font-semibold text-gray-500">Tokens Used:</span> {log.tokens_used}</div>
            <div><span className="font-semibold text-gray-500">Cost:</span> ${(log.tokens_used * COST_PER_TOKEN).toFixed(6)}</div>
          </div>

          <div className="border border-blue-200 rounded-xl p-4 bg-blue-50">
            <h4 className="font-semibold text-blue-800 mb-2">User Query (Prompt)</h4>
            <p className="whitespace-pre-wrap text-gray-800 text-sm">{log.prompt || 'N/A'}</p>
          </div>

          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50">
            <h4 className="font-semibold text-purple-800 mb-2">Assistant Response</h4>
            <p className="whitespace-pre-wrap text-gray-800 text-sm">{log.response || 'N/A'}</p>
          </div>

          {log.source_documents && log.source_documents.length > 0 && (
            <div className="border border-green-200 rounded-xl p-4 bg-green-50">
              <h4 className="font-semibold text-green-800 mb-2">Source Documents</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-800">
                {log.source_documents.map((doc, index) => (
                  <li key={index} className="truncate" title={doc}>{doc}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChatLogsTab: React.FC<ChatLogsTabProps> = ({ logic }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [chatLogs, setChatLogs] = useState<EnrichedQueryLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<EnrichedQueryLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [userFilter, setUserFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<EnrichedQueryLog | null>(null);

  // Column filters
  const [sessionFilter, setSessionFilter] = useState('');
  const [userColumnFilter, setUserColumnFilter] = useState('');
  const [timestampFilter, setTimestampFilter] = useState('');
  const [durationFilter, setDurationFilter] = useState('');
  const [tokenMinFilter, setTokenMinFilter] = useState('');
  const [tokenMaxFilter, setTokenMaxFilter] = useState('');
  const [queryFilter, setQueryFilter] = useState('');

  const [analytics, setAnalytics] = useState({
    totalSessions: 0,
    totalTokens: 0,
    avgTokensPerSession: 0,
    activeUsers: 0,
    totalQueries: 0,
    avgResponseTime: 1.8,
    avgConversationDuration: '0m 0s' // ← new field
  });

  const calculateAnalytics = useCallback((logs: EnrichedQueryLog[]) => {
  if (!logs || logs.length === 0) {
    setAnalytics({
      totalSessions: 0,
      totalTokens: 0,
      avgTokensPerSession: 0,
      activeUsers: 0,
      totalQueries: 0,
      avgResponseTime: 1.8,
      avgConversationDuration: '0m 0s' // ← new field
    });
    return;
  }

  const uniqueUsernames = new Set(logs.map(log => log.username).filter(Boolean));
  const uniqueConversations = new Set(logs.map(log => log.conversation_id));
  const totalTokens = logs.reduce((sum, log) => sum + (log.tokens_used || 0), 0);

  // Group logs by conversation_id to compute duration
  const conversationDurations: number[] = []; // in seconds

  const conversationMap = new Map<number, EnrichedQueryLog[]>();

  logs.forEach(log => {
    if (!conversationMap.has(log.conversation_id)) {
      conversationMap.set(log.conversation_id, []);
    }
    conversationMap.get(log.conversation_id)!.push(log);
  });

  conversationMap.forEach((queries) => {
    if (queries.length === 0) return;

    // Sort queries by timestamp
    queries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const firstQueryTime = new Date(queries[0].timestamp).getTime();
    const lastQueryTime = new Date(queries[queries.length - 1].timestamp).getTime();

    if (!isNaN(firstQueryTime) && !isNaN(lastQueryTime)) {
      const durationSeconds = Math.floor((lastQueryTime - firstQueryTime) / 1000);
      if (durationSeconds >= 0) {
        conversationDurations.push(durationSeconds);
      }
    }
  });

  const totalDurationSeconds = conversationDurations.reduce((a, b) => a + b, 0,);
  const avgDurationSeconds = conversationDurations.length > 0 
    ? totalDurationSeconds / conversationDurations.length 
    : 0;

  const avgMinutes = Math.floor(avgDurationSeconds / 60);
  const avgSeconds = Math.floor(avgDurationSeconds % 60);
  const avgConversationDuration = `${avgMinutes}m ${avgSeconds}s`;

  setAnalytics({
    totalSessions: uniqueConversations.size,
    totalTokens: totalTokens,
    avgTokensPerSession: uniqueConversations.size > 0 ? Math.round(totalTokens / uniqueConversations.size) : 0,
    activeUsers: uniqueUsernames.size,
    totalQueries: logs.length,
    avgResponseTime: 1.8,
    avgConversationDuration // ← now included
  });
}, []);

  const fetchChatHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/history/all/`, {
        method: 'GET',
        headers: {
          'Authorization': AUTH_TOKEN,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: ConversationLog[] = await response.json();
      
      // Flatten and enrich the nested data
      const flattenedLogs: EnrichedQueryLog[] = data.flatMap(conversation => {
        const { id: conversation_id, user } = conversation;

        return (conversation.query_logs || []).map((queryLog, index) => ({
          ...queryLog,
          id: `${conversation_id}-${queryLog.timestamp}-${index}`, 
          conversation_id,
          user_id: user.id,
          username: user.username,
          tokens_used: queryLog.tokens_used,
          tokens: queryLog.tokens_used,
          duration: calculateDuration(queryLog.timestamp),
          firstQuery: (queryLog.prompt || '').substring(0, 80) + ((queryLog.prompt || '').length > 80 ? '...' : ''),
        }));
      });

      setChatLogs(flattenedLogs);
      setFilteredLogs(flattenedLogs);
      calculateAnalytics(flattenedLogs);

      // Reset ALL filters on refresh
      setSearchTerm('');
      setDateFilter('all');
      setUserFilter('all');
      setSessionFilter('');
      setUserColumnFilter('');
      setTimestampFilter('');
      setDurationFilter('');
      setTokenMinFilter('');
      setTokenMaxFilter('');
      setQueryFilter('');
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

  // Filter logs based on search and all filters
  useEffect(() => {
    if (!chatLogs || chatLogs.length === 0) {
      setFilteredLogs([]);
      return;
    }

    let filtered = [...chatLogs];

    // Global search (top bar)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(log => {
        const prompt = (log.prompt || '').toLowerCase();
        const username = (log.username || '').toString().toLowerCase();
        return prompt.includes(searchLower) || username.includes(searchLower);
      });
    }

    // Column-specific filters
    if (sessionFilter) {
      filtered = filtered.filter(log => 
        log.conversation_id.toString().includes(sessionFilter)
      );
    }
    if (userColumnFilter) {
      filtered = filtered.filter(log => 
        (log.username || '').toLowerCase().includes(userColumnFilter.toLowerCase())
      );
    }
    if (timestampFilter) {
      filtered = filtered.filter(log => 
        formatTimestamp(log.timestamp).includes(timestampFilter)
      );
    }
    if (durationFilter) {
      filtered = filtered.filter(log => log.duration.includes(durationFilter));
    }
    if (tokenMinFilter || tokenMaxFilter) {
      const min = tokenMinFilter ? parseInt(tokenMinFilter) : -Infinity;
      const max = tokenMaxFilter ? parseInt(tokenMaxFilter) : Infinity;
      filtered = filtered.filter(log => 
        log.tokens_used >= min && log.tokens_used <= max
      );
    }
    if (queryFilter) {
      filtered = filtered.filter(log => 
        (log.prompt || '').toLowerCase().includes(queryFilter.toLowerCase())
      );
    }

    // Existing date & user dropdown filters
    if (userFilter !== 'all') {
      filtered = filtered.filter(log => log.username === userFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        if (isNaN(logDate.getTime())) return false;

        switch(dateFilter) {
          case 'today':
            return logDate.toDateString() === now.toDateString();
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return logDate >= weekAgo;
          case 'month':
            return logDate.getMonth() === now.getMonth() && logDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    setFilteredLogs(filtered);
  }, [searchTerm, userFilter, dateFilter, chatLogs,
      sessionFilter, userColumnFilter, timestampFilter, durationFilter,
      tokenMinFilter, tokenMaxFilter, queryFilter]);

  // Get unique users for filter
  const uniqueUsers = [...new Set(
    chatLogs.map(log => log.username).filter(Boolean)
  )];

  // Export data as CSV
  const exportData = () => {
    if (filteredLogs.length === 0) {
      alert('No data to export');
      return;
    }

    const csvContent = [
      ['Conversation ID', 'User', 'Timestamp', 'Duration', 'Tokens', 'Query', 'Response'],
      ...filteredLogs.map(log => [
        log.conversation_id,
        log.username || 'Unknown',
        log.timestamp || '',
        log.duration || '',
        log.tokens_used || 0,
        (log.prompt || '').replace(/,/g, ';').replace(/\n/g, ' '),
        (log.response || '').replace(/,/g, ';').replace(/\n/g, ' ')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat_logs_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Modal */}
      <ViewDetailsModal 
        log={selectedLog} 
        onClose={() => setSelectedLog(null)} 
      />
      
      {/* Header */}
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

      {/* Error Banner */}
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

      {/* Tabs */}
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

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Cards */}
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
                    <p className="text-3xl font-bold text-gray-900 mt-2">{analytics.avgResponseTime}s</p>
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

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h3>
              {chatLogs.length > 0 ? (
                <div className="space-y-4">
                  {chatLogs.slice(0, 5).map((log, index) => (
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
                        <p className="text-sm text-gray-600">{log.tokens_used} tokens</p>
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
            {/* Filters */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    placeholder="Search by query or user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex gap-3">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    <select 
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="appearance-none pl-10 pr-8 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>

                  {uniqueUsers.length > 0 && (
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                      <select 
                        value={userFilter}
                        onChange={(e) => setUserFilter(e.target.value)}
                        className="appearance-none pl-10 pr-8 py-3 border border-gray-200 rounded-xl text-sm bg-white focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                      >
                        <option value="all">All Users</option>
                        {uniqueUsers.map(user => (
                          <option key={user} value={user}>{user}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                  )}

                  <button 
                    onClick={exportData}
                    disabled={filteredLogs.length === 0}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Download size={16} />
                    Export
                  </button>
                </div>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Session
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="Filter ID..."
                            value={sessionFilter}
                            onChange={(e) => setSessionFilter(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        User
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="Filter user..."
                            value={userColumnFilter}
                            onChange={(e) => setUserColumnFilter(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Timestamp
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="e.g. 2025-11-25"
                            value={timestampFilter}
                            onChange={(e) => setTimestampFilter(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Duration
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="e.g. 3:45"
                            value={durationFilter}
                            onChange={(e) => setDurationFilter(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Tokens
                        <div className="mt-2 flex gap-1">
                          <input
                            type="number"
                            placeholder="Min"
                            value={tokenMinFilter}
                            onChange={(e) => setTokenMinFilter(e.target.value)}
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <input
                            type="number"
                            placeholder="Max"
                            value={tokenMaxFilter}
                            onChange={(e) => setTokenMaxFilter(e.target.value)}
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Query
                        <div className="mt-2">
                          <input
                            type="text"
                            placeholder="Filter query..."
                            value={queryFilter}
                            onChange={(e) => setQueryFilter(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">#{log.conversation_id}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                              {(log.username || 'U').toString().charAt(0).toUpperCase()}
                            </div>
                            <span className="ml-3 text-sm text-gray-900">{log.username || 'Unknown'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatTimestamp(log.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-1">
                            <Clock size={14} className="text-gray-400" />
                            {log.duration}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-3 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                            {log.tokens_used}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                          <div className="truncate">{log.firstQuery}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button 
                            onClick={() => setSelectedLog(log)}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors inline-flex items-center gap-1"
                            title="View Full Conversation"
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
                  <p className="text-gray-500">
                    {chatLogs.length === 0 ? 'No chat logs available' : 'No chat logs found matching your filters'}
                  </p>
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

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Token Usage by User */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Token Usage by User</h3>
              {uniqueUsers.length > 0 ? (
                <div className="space-y-4">
                  {uniqueUsers.map((user) => {
                    const userLogs = chatLogs.filter(log => log.username === user);
                    const userTokens = userLogs.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
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
                        const logDate = new Date(log.timestamp);
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
                      .sort((a, b) => (b.tokens_used || 0) - (a.tokens_used || 0))
                      .slice(0, 6)
                      .map((log) => (
                        <div 
                          key={log.id} 
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <span className="text-sm font-bold text-gray-400 min-w-[24px]">#{log.conversation_id}</span>
                          <p className="text-sm text-gray-700 flex-1 truncate" title={log.prompt}>
                            {log.prompt || 'No query text'}
                          </p>
                          <span className="text-xs font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded-full whitespace-nowrap">
                            {log.tokens_used} tokens
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No queries available</p>
                )}
              </div>
            </div>

            {/* Query Length Distribution */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Query Length Distribution</h3>
              {chatLogs.length > 0 ? (
                <div className="space-y-4">
                  {(() => {
                    const short = chatLogs.filter(log => (log.prompt?.length || 0) < 50).length;
                    const medium = chatLogs.filter(log => (log.prompt?.length || 0) >= 50 && (log.prompt?.length || 0) < 150).length;
                    const long = chatLogs.length - short - medium;
                    const total = chatLogs.length;
                    
                    const percentShort = total > 0 ? (short/total)*100 : 0;
                    const percentMedium = total > 0 ? (medium/total)*100 : 0;
                    const percentLong = total > 0 ? (long/total)*100 : 0;

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
                            <span className="text-sm font-medium text-gray-700">Medium (50-150 chars)</span>
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
                            <span className="text-sm font-medium text-gray-700">Long (&gt;150 chars)</span>
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

<<<<<<< Updated upstream
export default ChatLogsTab;

=======
export default ChatLogsTab;
>>>>>>> Stashed changes
