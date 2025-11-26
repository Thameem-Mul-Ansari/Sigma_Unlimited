// AdminPanel.tsx (src/components/Admin/AdminPanel.tsx)

import React, { useState } from 'react';
import { useAdminLogic } from '../../hooks/useAdminLogic';
import { Menu, Sparkles } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { MetricsDashboard } from './MetricsDashboard';
import { DataIngestionTab } from './DataIngestionTab';
import { FAQManagementTab } from './FAQManagementTab';
import { AnalyticsTab } from './AnalyticsTab';
import ChatLogsTab from './ChatLogsTab';

// 👇 New Interface for AdminPanel Props
interface AdminPanelProps {
    onLogout: () => void;
}

// 👇 Accept onLogout prop
export const AdminPanel: React.FC<AdminPanelProps> = ({ onLogout }) => {
    const logic = useAdminLogic();
    const { activeTab, navItems } = logic;
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return <MetricsDashboard logic={logic} />;
            case 'ingestion':
                return <DataIngestionTab logic={logic} />;
            case 'logs':
                return <ChatLogsTab logic={logic} />;
            case 'faq':
                return <FAQManagementTab logic={logic} />;
            case 'analytics':
                return <AnalyticsTab/>;
            default:
                return <MetricsDashboard logic={logic} />;
        }
    };
    
    const currentTabLabel = navItems.find(item => item.id === activeTab)?.label || 'Admin Panel';

    return (
        <div className="flex h-screen bg-gray-50 text-gray-900 overflow-hidden">
            
            {/* Sidebar (Desktop view / Mobile drawer) */}
            <AdminSidebar 
                logic={logic} 
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)} 
                onLogout={onLogout} // <<< FIX: Pass onLogout to AdminSidebar
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col overflow-y-auto">
                
                {/* Header (Desktop + Mobile) */}
                <div className="sticky top-0 z-30 flex items-center justify-between h-16 bg-white border-b border-gray-200 px-4 shadow-sm flex-shrink-0">
                    
                    {/* Left: Mobile Menu + Title */}
                    <div className="flex items-center">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 mr-3 hover:bg-gray-100 rounded-lg text-gray-600 md:hidden"
                            aria-label="Open sidebar"
                        >
                            <Menu size={20} />
                        </button>
                        <div className="flex items-center gap-3">    
                            <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                                <Sparkles className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="font-extrabold text-xl bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                                    Σ-Unlimited
                                </h1>
                            </div>
                        </div>
                        
                    </div>

                    {/* Right: Quick actions (User avatar) */}
                    <div className="flex items-center gap-3">
                         <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/30">A</div>
                    </div>
                </div>

                {/* Content Renderer */}
                <div className="flex-1 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}