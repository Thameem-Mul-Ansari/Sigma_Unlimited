// src/components/Admin/AnalyticsTab.tsx

import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { Activity, Clock, Zap } from 'lucide-react';
import axios from 'axios';

const API_BASE = "https://gx5cdmd5-8000.inc1.devtunnels.ms/api";
const AUTH_TOKEN = "19065757542afc134cb7c3c4b0cbe395e66c1c0a";

export const AnalyticsTab: React.FC = () => {
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [peakHour, setPeakHour] = useState<string>("–");
  const [totalQueries, setTotalQueries] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get(`${API_BASE}/history/all/`, {
          headers: { Authorization: `Token ${AUTH_TOKEN}` },
        });

        const counts = Array(24).fill(0);
        let total = 0;

        res.data.forEach((conv: any) => {
          conv.query_logs?.forEach((log: any) => {
            const date = new Date(log.timestamp);
            const hour = date.getHours();
            if (!isNaN(hour)) {
              counts[hour]++;
              total++;
            }
          });
        });

       const formatted = counts.map((count, hour) => {
  const isPM = hour >= 12;
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

  return {
    hour,
    label: `${displayHour} ${isPM ? 'PM' : 'AM'}`,
    queries: count,
  };
});

        const max = Math.max(...counts);
        const peak = formatted.find(d => d.queries === max)?.label || "–";

        setHourlyData(formatted);
        setPeakHour(peak);
        setTotalQueries(total);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load analytics:", err);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">Analytics</h1>
        <p className="text-gray-600 mt-1">Daily usage patterns • 24-hour view</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Queries</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {loading ? '––' : totalQueries.toLocaleString()}
              </p>
            </div>
            <Activity className="w-9 h-9 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Peak Hour</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {loading ? '––' : peakHour}
              </p>
            </div>
            <Clock className="w-9 h-9 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="text-2xl font-bold text-green-600 mt-1">Live</p>
            </div>
            <div className="relative">
              <Zap className="w-9 h-9 text-green-600" />
              <span className="absolute inset-0 animate-ping">
                <Zap className="w-9 h-9 text-green-400 opacity-75" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-800">Activity by Hour</h2>
          <p className="text-sm text-gray-500 mt-1">Queries throughout the day</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="h-80 flex items-center justify-center">
              <p className="text-gray-500">Loading chart...</p>
            </div>
          ) : totalQueries === 0 ? (
            <div className="h-80 flex flex-col items-center justify-center text-gray-400">
              <Clock className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No activity yet</p>
              <p className="text-sm">Users haven't started chatting</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <XAxis
  dataKey="label"
  tick={{ fontSize: 11, fill: '#6b7280' }}   // Smaller, cleaner
  axisLine={false}
  tickLine={false}
  interval="preserveStartEnd"   // Prevents overcrowding on small screens
/>
                <YAxis
                  tick={{ fontSize: 13, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />

                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#374151' }}
                />

                <Area
                  type="monotone"
                  dataKey="queries"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#fillGradient)"
                  dot={{ fill: '#4f46e5', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500">
        Updated just now • All times in your local timezone
      </div>
    </div>
  );
};