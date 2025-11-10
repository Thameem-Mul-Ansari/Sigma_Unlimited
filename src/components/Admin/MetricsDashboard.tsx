// src/components/Admin/MetricsDashboard.tsx

import React from 'react';
import { UseAdminLogicReturn } from '../../hooks/useAdminLogic';
import { Loader2, Zap, TrendingUp, CheckCircle, AlertTriangle } from 'lucide-react';

interface MetricsDashboardProps {
    logic: UseAdminLogicReturn;
}

// Reusable component for displaying a single metric
const MetricCard: React.FC<UseAdminLogicReturn['mockSystemMetrics'][0]> = ({ title, value, unit, color, icon: Icon }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 group">
        <div className="flex items-start justify-between">
            <div className="flex-1">
                <p className="text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">{title}</p>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-gray-900">{value}</span>
                    <span className="text-sm text-gray-500">{unit}</span>
                </div>
            </div>
            <div className={`p-2 rounded-lg ${color.replace('text', 'bg').replace('-600', '-50')} group-hover:scale-105 transition-transform`}>
                <Icon size={20} className={color} />
            </div>
        </div>
        
        {/* Progress Bar for Token Limit */}
        {title.includes('Token') && (
            <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Monthly usage</span>
                    <span className="font-medium text-gray-700">90%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: '90%' }}
                    ></div>
                </div>
            </div>
        )}
    </div>
);

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ logic }) => {
    const { mockSystemMetrics } = logic;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-semibold text-gray-900">System Monitoring</h1>
                    <p className="text-sm text-gray-500 mt-1">Real-time metrics and system health</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    All systems operational
                </div>
            </div>

            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {mockSystemMetrics.map((metric, index) => (
                    <MetricCard key={index} {...metric} />
                ))}
            </div>

            {/* Charts & Status Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                
                {/* API Usage Chart */}
                <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">API Usage Analytics</h3>
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">Last 30 days</span>
                    </div>
                    <div className="h-48 flex flex-col items-center justify-center text-gray-400 border border-dashed border-gray-300 rounded-lg bg-gray-50/50">
                        <TrendingUp size={32} className="text-gray-300 mb-2" />
                        <span className="text-sm">Token consumption trends</span>
                        <span className="text-xs text-gray-400 mt-1">Chart visualization</span>
                    </div>
                </div>

                {/* System Events */}
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">System Events</h3>
                        <span className="text-xs text-gray-500">Recent</span>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-200">
                            <AlertTriangle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-red-700">High Error Rate Detected</p>
                                <p className="text-xs text-red-600 mt-0.5">API 500s exceeding threshold</p>
                                <span className="text-xs text-red-500 mt-1 block">2 minutes ago</span>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                            <Zap size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-700">Model Update</p>
                                <p className="text-xs text-gray-600 mt-0.5">gemini-2.5-flash deployed</p>
                                <span className="text-xs text-gray-500 mt-1 block">1 hour ago</span>
                            </div>
                        </div>
                        
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200">
                            <CheckCircle size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-green-700">Systems Normal</p>
                                <p className="text-xs text-green-600 mt-0.5">All services operating normally</p>
                                <span className="text-xs text-green-500 mt-1 block">3 hours ago</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Footer */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="text-sm font-medium text-blue-700">Response Time</div>
                    <div className="text-lg font-bold text-blue-900 mt-1">142ms</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                    <div className="text-sm font-medium text-green-700">Uptime</div>
                    <div className="text-lg font-bold text-green-900 mt-1">99.98%</div>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                    <div className="text-sm font-medium text-purple-700">Active Users</div>
                    <div className="text-lg font-bold text-purple-900 mt-1">1,247</div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                    <div className="text-sm font-medium text-orange-700">API Calls</div>
                    <div className="text-lg font-bold text-orange-900 mt-1">24.5K</div>
                </div>
            </div>
        </div>
    );
}