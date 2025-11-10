import React, { useState } from 'react';
import { UseAdminLogicReturn } from '../../hooks/useAdminLogic';
import { FileText, UploadCloud, CheckCircle, AlertTriangle, Clock, Trash2, Repeat2 } from 'lucide-react';

interface DataIngestionTabProps {
    logic: UseAdminLogicReturn;
}

const StatusPill: React.FC<{ status: 'Success' | 'Failed' | 'Processing' }> = ({ status }) => {
    let classes = '';
    let Icon = FileText;
    switch (status) {
        case 'Success':
            classes = 'bg-green-100 text-green-700';
            Icon = CheckCircle;
            break;
        case 'Failed':
            classes = 'bg-red-100 text-red-700';
            Icon = AlertTriangle;
            break;
        case 'Processing':
            classes = 'bg-blue-100 text-blue-700';
            Icon = Clock;
            break;
    }
    return (
        <span className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold rounded-full ${classes}`}>
            <Icon size={14} className={status === 'Processing' ? 'animate-spin' : ''} />
            {status}
        </span>
    );
};


export const DataIngestionTab: React.FC<DataIngestionTabProps> = ({ logic }) => {
    const { mockIngestionHistory, userRole } = logic;
    const [dragging, setDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragging(false);
        const files = Array.from(e.dataTransfer.files);
        console.log('Files dropped:', files);
        alert(`Ingesting ${files.length} files... (Mock)`);
    };
    
    const canUpload = userRole === 'Admin' || userRole === 'Uploader';

    return (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 border-b pb-4 border-gray-100">Knowledge Base Ingestion</h2>

            {/* File Upload Area (Dropzone) */}
            <div 
                className={`p-10 border-4 border-dashed rounded-2xl transition-all duration-300 text-center 
                    ${dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
                    ${canUpload ? 'cursor-pointer' : 'opacity-60 cursor-not-allowed'}`}
                onDragOver={canUpload ? handleDragEnter : undefined}
                onDragEnter={canUpload ? handleDragEnter : undefined}
                onDragLeave={canUpload ? handleDragLeave : undefined}
                onDrop={canUpload ? handleDrop : undefined}
            >
                <UploadCloud size={48} className={`mx-auto mb-4 ${dragging ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className="text-lg font-semibold text-gray-700 mb-1">{canUpload ? 'Drag and drop files here to upload' : 'You do not have permission to upload files.'}</p>
                <p className="text-sm text-gray-500 mb-4">Supported: PDF, Excel, Image files (OCR-enabled)</p>
                
                <label 
                    htmlFor="file-upload"
                    className={`inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white 
                        ${canUpload ? 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30 cursor-pointer' : 'bg-gray-400 cursor-not-allowed'}`}
                >
                    Browse Files
                </label>
                <input id="file-upload" type="file" multiple className="hidden" disabled={!canUpload} />
            </div>

            {/* Ingestion History Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">Ingestion History</h3>
                        <p className="text-sm text-gray-500">Monitor all documents added to the knowledge base.</p>
                    </div>
                    <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">View All Logs</button>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploader</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {mockIngestionHistory.map((record) => (
                                <tr key={record.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-2">
                                        <FileText size={16} className="text-blue-500" />
                                        {record.fileName}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.fileType}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <StatusPill status={record.status} />
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.ingestionDate}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.uploader}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                        <button 
                                            onClick={() => alert(`Re-ingesting ${record.fileName}`)}
                                            className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                            title="Re-ingest file"
                                        >
                                            <Repeat2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => alert(`Deleting ${record.fileName}`)}
                                            className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                            title="Delete file"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}