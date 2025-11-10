// src/components/Admin/AdminSidebar.tsx

import React from 'react';
import { UseAdminLogicReturn, AdminTab } from '../../hooks/useAdminLogic'; // Assuming this is defined
import { LogOut, X } from 'lucide-react';

interface AdminSidebarProps {
    logic: UseAdminLogicReturn;
    onClose: () => void;
    isOpen: boolean; 
    onLogout: () => void; // <<< FIX: Added onLogout prop
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ logic, isOpen, onClose, onLogout }) => { // <<< FIX: Destructure onLogout
    const { activeTab, setActiveTab, navItems, userRole } = logic;

    const handleTabClick = (id: AdminTab) => {
        setActiveTab(id);
        if (window.innerWidth < 768) { 
            onClose(); 
        }
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div 
                    className="fixed inset-0 bg-black/30 z-40 md:hidden" 
                    onClick={onClose}
                    aria-hidden="true"
                />
            )}
            
            <div 
                className={`
                    fixed top-0 left-0 h-full w-64
                    bg-white/95 backdrop-blur-md border-r border-gray-100 flex flex-col flex-shrink-0 shadow-xl z-50
                    transition-transform duration-300 ease-in-out 
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                    md:relative md:translate-x-0 
                `}
            >
                
                {/* Header / Logo and Mobile Close Button */}
                <div className="p-4 flex items-center justify-between border-b border-gray-100 relative">
                    <img 
                        src="UBTI-Logo.png" 
                        alt="UBTI Logo" 
                        className="w-40 h-10 object-contain"
                    />
                    <button
                        onClick={onClose}
                        className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600 transition-colors"
                        aria-label="Close sidebar"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleTabClick(item.id)}
                            className={`
                                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left
                                ${activeTab === item.id
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 font-semibold transform hover:scale-[1.01]'
                                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
                                }
                            `}
                        >
                            <item.icon size={20} className="flex-shrink-0" />
                            <span className="text-sm">{item.label}</span>
                        </button>
                    ))}
                </nav>

                {/* Footer / User & Logout */}
                <div className="p-4 border-t border-gray-100 flex-shrink-0">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 mb-3 shadow-inner">
                        <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md">
                            A
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-gray-800">Ansari</div>
                            <div className="text-xs text-blue-600 font-medium">Role: {userRole}</div>
                        </div>
                    </div>
                    <button
                        onClick={onLogout} // <<< FIX: Call the actual onLogout prop
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors font-medium"
                    >
                        <LogOut size={16} />
                        <span className="text-sm">Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}