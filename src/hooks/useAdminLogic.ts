import { useState, useMemo } from 'react';
import { Upload, Activity, MessageSquare, BookOpen, BarChart2 } from 'lucide-react';

// --- Type Definitions ---
export type AdminTab = 'dashboard' | 'ingestion' | 'logs' | 'faq' | 'analytics';

export interface FileIngestionRecord {
    id: string;
    fileName: string;
    fileType: 'PDF' | 'Excel' | 'Image';
    status: 'Success' | 'Failed' | 'Processing';
    ingestionDate: string;
    uploader: string;
}

export interface SystemMetric {
    title: string;
    value: string;
    unit: string;
    color: string;
    icon: React.ElementType;
}

export interface NavItem {
    id: AdminTab;
    label: string;
    icon: React.ElementType;
    roles: ('Admin' | 'Uploader' | 'Viewer')[];
}

// --- Custom Hook Definition ---
export function useAdminLogic() {
    const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
    const [userRole, setUserRole] = useState<'Admin' | 'Uploader' | 'Viewer'>('Admin'); 
    
    // --- Mock Data ---

    const navItems: NavItem[] = useMemo(() => [
        { id: 'dashboard', label: 'System Monitoring', icon: Activity, roles: ['Admin', 'Viewer'] },
        { id: 'ingestion', label: 'Knowledge Base Ingestion', icon: Upload, roles: ['Admin', 'Uploader'] },
        { id: 'logs', label: 'Chat Session Logs', icon: MessageSquare, roles: ['Admin', 'Viewer'] },
        { id: 'faq', label: 'FAQ Management', icon: BookOpen, roles: ['Admin', 'Uploader'] },
        { id: 'analytics', label: 'Analytics & Insights', icon: BarChart2, roles: ['Admin', 'Viewer'] },
    ], []);

    const filteredNavItems = useMemo(() => {
        return navItems.filter(item => item.roles.includes(userRole));
    }, [navItems, userRole]);

    const mockIngestionHistory: FileIngestionRecord[] = [
        { id: '1', fileName: 'Q2_Sales_Report.xlsx', fileType: 'Excel', status: 'Success', ingestionDate: '2025-10-20', uploader: 'Admin' },
        { id: '2', fileName: 'Policy_Manual_v3.pdf', fileType: 'PDF', status: 'Success', ingestionDate: '2025-10-20', uploader: 'Admin' },
        { id: '3', fileName: 'User_Feedback_2025.txt', fileType: 'PDF', status: 'Failed', ingestionDate: '2025-10-21', uploader: 'Uploader' },
        { id: '4', fileName: 'Product_Diagram.jpg', fileType: 'Image', status: 'Processing', ingestionDate: '2025-10-21', uploader: 'Uploader' },
    ];

    const mockSystemMetrics: SystemMetric[] = [
        { title: 'Total Tokens Used (MoM)', value: '1.2M', unit: 'tokens', color: 'text-blue-600', icon: Activity },
        { title: 'Average Latency', value: '450', unit: 'ms', color: 'text-sky-600', icon: MessageSquare },
        { title: 'Ingestion Success Rate', value: '95', unit: '%', color: 'text-green-600', icon: Upload },
        { title: 'API Uptime', value: '99.9', unit: '%', color: 'text-teal-600', icon: BarChart2 }
    ];

    // --- Return Values ---
    return {
        // State
        activeTab, setActiveTab,
        userRole, setUserRole,

        // Data
        navItems: filteredNavItems,
        mockIngestionHistory,
        mockSystemMetrics,
    };
}

// Exported types for use in components
export type UseAdminLogicReturn = ReturnType<typeof useAdminLogic>;