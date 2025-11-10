import React, { useState } from 'react';
import { UseAdminLogicReturn } from '../../hooks/useAdminLogic';
import { Plus, Edit, Trash2, Search, X } from 'lucide-react';

interface FAQManagementTabProps {
    logic: UseAdminLogicReturn;
}

// Mock FAQ Data
const mockFAQs = [
    { id: 1, question: 'What is the standard vacation policy for new hires?', answer: 'New hires receive 15 days of vacation annually, prorated for the first year.', lastUpdated: '2025-09-10' },
    { id: 2, question: 'Where can I find the latest brand guidelines?', answer: 'The latest brand guidelines are available on the SharePoint Design Portal under "Assets > Brand".', lastUpdated: '2025-10-01' },
    { id: 3, question: 'How do I reset my network password?', answer: 'Please navigate to portal.ubti.com/reset and follow the on-screen instructions. Requires MFA.', lastUpdated: '2025-08-25' },
];

export const FAQManagementTab: React.FC<FAQManagementTabProps> = ({ logic }) => {
    const { userRole } = logic;
    const [faqs, setFaqs] = useState(mockFAQs);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFaq, setEditingFaq] = useState<typeof mockFAQs[0] | null>(null);

    const canEdit = userRole === 'Admin' || userRole === 'Uploader';

    const openEditModal = (faq: typeof mockFAQs[0] | null) => {
        setEditingFaq(faq);
        setIsModalOpen(true);
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        // Mock save logic
        alert(`FAQ ${editingFaq?.id ? 'updated' : 'created'} successfully!`);
        setIsModalOpen(false);
        setEditingFaq(null);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Are you sure you want to delete this FAQ?')) {
            setFaqs(faqs.filter(f => f.id !== id));
        }
    };

    const FaqModal: React.FC = () => (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg mx-auto shadow-2xl border border-gray-100">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-800">{editingFaq ? 'Edit FAQ' : 'Add New FAQ'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><X size={20} /></button>
                </div>
                <form className="p-6 space-y-4" onSubmit={handleSave}>
                    <label className="block space-y-1">
                        <span className="text-sm font-medium text-gray-700">Question (User Query)</span>
                        <input
                            type="text"
                            required
                            defaultValue={editingFaq?.question || ''}
                            placeholder="e.g., How do I submit an expense report?"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-gray-50/50"
                        />
                    </label>
                    <label className="block space-y-1">
                        <span className="text-sm font-medium text-gray-700">Answer (Chatbot Response)</span>
                        <textarea
                            required
                            defaultValue={editingFaq?.answer || ''}
                            placeholder="Provide a detailed, direct answer..."
                            rows={5}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all bg-gray-50/50 resize-none"
                        />
                    </label>
                    <div className="flex justify-end pt-4 space-x-3">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-100 font-medium">Cancel</button>
                        <button type="submit" className="px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium shadow-lg shadow-blue-500/30">
                            {editingFaq ? 'Update FAQ' : 'Create FAQ'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

    return (
        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 border-b pb-4 border-gray-100">FAQ Management</h2>

            {/* Header/Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search FAQs..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                    />
                </div>
                {canEdit && (
                    <button
                        onClick={() => openEditModal(null)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl hover:from-blue-600 hover:to-blue-700 font-medium shadow-lg shadow-blue-500/30"
                    >
                        <Plus size={18} />
                        Add New FAQ
                    </button>
                )}
            </div>

            {/* FAQ List */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">ID</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">Question</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Answer Snippet</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">Last Updated</th>
                                {canEdit && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {faqs.map((faq) => (
                                <tr key={faq.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{faq.id}</td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{faq.question}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 max-w-sm truncate">{faq.answer}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{faq.lastUpdated}</td>
                                    {canEdit && (
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                            <button 
                                                onClick={() => openEditModal(faq)}
                                                className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                                title="Edit FAQ"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(faq.id)}
                                                className="text-red-600 hover:text-red-900 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                                title="Delete FAQ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && <FaqModal />}
        </div>
    );
}