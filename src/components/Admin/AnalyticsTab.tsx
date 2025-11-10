import React from 'react';
import { UseAdminLogicReturn } from '../../hooks/useAdminLogic';
import { BarChart2, TrendingUp, Clock, Users, Zap, AlertTriangle } from 'lucide-react';

interface AnalyticsTabProps {
    logic: UseAdminLogicReturn;
}

const ChartPlaceholder: React.FC<{ title: string; icon: React.ElementType }> = ({ title, icon: Icon }) => (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 h-96">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
        <div className="h-full flex flex-col items-center justify-center text-gray-400 border border-dashed p-4 rounded-xl">
            <Icon size={48} className="text-gray-300 mb-2" />
            <span className="text-sm text-center">Mock Data Visualization Area</span>
        </div>
    </div>
);

const InsightCard: React.FC<{ title: string; value: string; trend: string; color: string; icon: React.ElementType }> = ({ title, value, trend, color, icon: Icon }) => (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <div className="flex items-center gap-3">
            <Icon size={24} className={color} />
            <p className="text-sm font-medium text-gray-500">{title}</p>
        </div>
        <div className="text-3xl font-extrabold text-gray-900 mt-2">{value}</div>
        <p className={`text-xs mt-1 ${color}`}>{trend}</p>
    </div>
);

export const AnalyticsTab: React.FC<AnalyticsTabProps> = () => {
    // Mock Data
    const mockInsights = [
        { title: 'Daily Active Users', value: '350', trend: '+12% from last week', color: 'text-green-600', icon: Users },
        { title: 'Avg. Session Duration', value: '3:45', trend: 'Stable', color: 'text-blue-600', icon: Clock },
        { title: 'Response Satisfaction', value: '85%', trend: '+3% from last week', color: 'text-teal-600', icon: Zap },
        { title: 'Total Queries (Today)', value: '1,520', trend: 'High Volume', color: 'text-orange-600', icon: BarChart2 },
    ];

    return (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 border-b pb-4 border-gray-100">Analytics & Insights</h2>

            {/* Key Insights Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
                {mockInsights.map((insight, index) => (
                    <InsightCard key={index} {...insight} />
                ))}
            </div>

            {/* Detailed Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <ChartPlaceholder title="User Queries by Topic (Top 10)" icon={BarChart2} />
                <ChartPlaceholder title="Daily Active Users (DAU) Trend" icon={TrendingUp} />
                <ChartPlaceholder title="Peak Usage Time Heatmap (Hourly)" icon={Clock} />
                <ChartPlaceholder title="Feedback/Sentiment Distribution" icon={Zap} />
            </div>

            {/* Critical Data List */}
            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <AlertTriangle size={24} className="text-red-500" /> Top Unanswered/Disliked Queries
                </h3>
                <ul className="space-y-3">
                    <li className="text-sm text-gray-700 p-3 rounded-lg bg-red-50 border border-red-200 font-medium">1. "Do we support Kubernetes deployment?" (4 Dislikes, 0 successful follow-ups)</li>
                    <li className="text-sm text-gray-700 p-3 rounded-lg hover:bg-gray-50">2. "Latest policy regarding remote work stipends." (Needs FAQ update)</li>
                    <li className="text-sm text-gray-700 p-3 rounded-lg hover:bg-gray-50">3. "When is the next company all-hands meeting?"</li>
                </ul>
            </div>
        </div>
    );
}