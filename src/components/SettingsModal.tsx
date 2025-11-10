import React, { useState } from 'react';
import { UseChatLogicReturn } from '../hooks/useChatLogic';
import { X, Settings, Server } from 'lucide-react';

interface SettingsModalProps {
    logic: UseChatLogicReturn;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ logic }) => {
    // Destructure the correct config state and setter from logic
    const { 
        isConfigOpen, 
        setIsConfigOpen, 
        backendConfig, 
        setBackendConfig 
    } = logic; 

    // Use local state to manage input changes before saving/canceling
    const [localBackendUrl, setLocalBackendUrl] = useState(backendConfig.backendUrl);
    
    if (!isConfigOpen) return null;

    const handleSave = () => {
        const url = localBackendUrl.trim();
        if (url) {
            // Only update the URL part of the backend config
            setBackendConfig(prev => ({ ...prev, backendUrl: url }));
            setIsConfigOpen(false);
        } else {
            alert('Please enter a valid Backend URL.');
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-sky-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <Settings className="text-white" size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
                                Backend Configuration
                            </h3>
                            <p className="text-sm text-gray-600">API Endpoint Settings</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsConfigOpen(false)}
                        className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        aria-label="Close settings"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Backend URL Input */}
                    <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                            <Server size={16} className="text-blue-600" />
                            Backend Base URL
                        </label>
                        <input
                            type="text"
                            // Use local state for input
                            value={localBackendUrl} 
                            // Update local state onChange
                            onChange={(e) => setLocalBackendUrl(e.target.value)}
                            placeholder="e.g. https://your-backend.devtunnels.ms"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-gray-50/50 placeholder:text-gray-400"
                        />
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            Current URL: {backendConfig.backendUrl}
                        </p>
                    </div>

                    {/* Model Selection is removed as it belongs to a different architecture */}
                </div>

                {/* Footer Actions */}
                <div className="flex flex-col sm:flex-row gap-3 p-6 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
                    <button
                        onClick={() => {
                            // Reset local state if user cancels
                            setLocalBackendUrl(backendConfig.backendUrl);
                            setIsConfigOpen(false);
                        }}
                        className="flex-1 px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100 transition-all duration-200 font-medium shadow-sm hover:shadow-md"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={localBackendUrl.trim() === backendConfig.backendUrl || !localBackendUrl.trim()}
                    >
                        Save Configuration
                    </button>
                </div>
            </div>
        </div>
    );
}