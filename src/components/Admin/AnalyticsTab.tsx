import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';
import { Clock, AlertCircle } from 'lucide-react';
import axios from 'axios';

const API_BASE = "https://gx5cdmd5-8000.inc1.devtunnels.ms/api";
const AUTH_TOKEN = "19065757542afc134cb7c3c4b0cbe395e66c1c0a";

interface QueryLog {
  timestamp: string;
}

interface Conversation {
  query_logs: QueryLog[];
}

interface AnalyticsTabProps {
  logic?: any; // optional since we don't use it here, but keeps compatibility
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        const response = await axios.get(`${API_BASE}/history/all/`, {
          headers: {
            Authorization: `Token ${AUTH_TOKEN}`,
          },
        });

        const conversations: Conversation[] = response.data;

        // Count queries per hour (0–23)
        const hourCounts = Array(24).fill(0);

        conversations.forEach((conv) => {
          conv.query_logs.forEach((log) => {
            const hour = new Date(log.timestamp).getHours();
            hourCounts[hour]++;
          });
        });

        // Format for chart
        const chartData = hourCounts.map((count, hour) => ({
          hour,
          time: `${hour.toString().padStart(2, '0')}:00`,
          queries: count,
          fill:
            count === 0 ? '#f3f4f6' :
            count <= 2 ? '#dbeafe' :
            count <= 5 ? '#93c5fd' :
            count <= 10 ? '#60a5fa' :
            count <= 20 ? '#3b82f6' :
            count <= 30 ? '#2563eb' :
            '#1d4ed8',
        }));

        setData(chartData);
        setLoading(false);
      } catch (err) {
        console.error("Failed to fetch analytics data:", err);
        setError("Could not load usage analytics. Please try again later.");
        setLoading(false);
      }
    };

    fetchUsageData();
  }, []);

  const maxQueries = Math.max(...data.map(d => d.queries), 0);
  const peakHour = data.find(d => d.queries === maxQueries);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-xl shadow-2xl border border-gray-200">
          <p className="font-semibold text-gray-800">{payload[0].payload.time}</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {payload[0].value} {payload[0].value === 1 ? 'query' : ''} queries
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (value === 0) return null;
    return (
      <text
        x={x + width / 2}
        y={y + height / 2 + 5}
        fill="white"
        textAnchor="middle"
        fontSize={14}
        fontWeight="bold"
      >
        {value}
      </text>
    );
  };

  return (
    <div className="p-6 sm:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-gray-800">Analytics & Insights</h2>
      </div>

      {/* Peak Usage Heatmap Card */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-800">Peak Usage Time</h3>
              <p className="text-gray-500 mt-1">Live query activity by hour of day (24h)</p>
            </div>
          </div>
        </div>

        <div className="p-8">
          {loading && (
            <div className="flex items-center justify-center h-96">
              <p className="text-gray-500 text-lg">Loading live data...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center h-96 text-red-500 gap-4">
              <AlertCircle size={64} />
              <p className="text-lg">{error}</p>
            </div>
          )}

          {!loading && !error && maxQueries === 0 && (
            <div className="flex flex-col items-center justify-center h-96 text-gray-400">
              <Clock size={64} className="mb-4 text-gray-300" />
              <p className="text-lg">No activity recorded yet</p>
            </div>
          )}

          {!loading && !error && maxQueries > 0 && (
            <>
              <ResponsiveContainer width="100%" height={520}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="time"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 13, fill: '#6b7280' }}
                  />
                  <YAxis
                    label={{
                      value: 'Number of Queries',
                      angle: -90,
                      position: 'insideLeft',
                      style: { fontSize: 15, fill: '#374151' },
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
                  <Bar dataKey="queries" radius={[12, 12, 0, 0]}>
                    <LabelList content={<CustomLabel />} />
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Peak Highlight */}
              {peakHour && (
                <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <p className="text-center text-lg">
                    <span className="font-semibold text-gray-700">Peak hour today:</span>{' '}
                    <span className="text-3xl font-bold text-blue-600">{peakHour.time}</span>{' '}
                    <span className="text-gray-600">with</span>{' '}
                    <span className="text-3xl font-bold text-blue-600">{peakHour.queries}</span>{' '}
                    <span className="text-gray-600">queries</span>
                  </p>
                </div>
              )}

              {/* Legend */}
              <div className="flex flex-wrap justify-center gap-6 mt-8 text-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-200"></div>
                  <span>No activity</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-300"></div>
                  <span>Low</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500"></div>
                  <span>Medium</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-700"></div>
                  <span>High</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-900"></div>
                  <span className="font-bold text-blue-900">Peak</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};