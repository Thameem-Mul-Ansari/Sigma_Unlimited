import React from 'react';
import { 
    Menu, Mic, Square, Upload, X, 
    Send, Sparkles, FileText, Copy, ThumbsUp, ThumbsDown,
    RefreshCw, Languages, MoreVertical, ExternalLink
} from 'lucide-react';
import { UseChatLogicReturn } from '../hooks/useChatLogic';

// --- Sub-component for a single message ---
interface MessageBubbleProps {
    message: UseChatLogicReturn['messages'][0];
    isLast: boolean;
    logic: UseChatLogicReturn;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isLast, logic }) => {
    // ⚠️ MODIFIED: Destructure getUserInitial from logic
    const { t, copyToClipboard, handleFeedback, messages, regenerateResponse, getUserInitial } = logic; 

    const messageIndex = messages.findIndex(m => m.id === message.id);
    const lastUserMessage = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user');

    // Format document name for display
    const formatDocumentName = (name: string) => {
        // Remove file extension and replace underscores/dashes with spaces
        return name
            .replace(/\.[^/.]+$/, "") // Remove file extension
            .replace(/[_-]/g, " ") // Replace underscores and dashes with spaces
            .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
    };

    // Check if we should display source documents - handle undefined case
    const shouldDisplaySources = message.sourceDocuments && 
        message.sourceDocuments.length > 0 && 
        !message.sourceDocuments.every(doc => doc.name === "[No documents retrieved]");

    if (message.role === 'user') {
        return (
            <div className="flex justify-end">
                <div className="max-w-[85%] sm:max-w-2xl">
                    <div className="flex items-center justify-end gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-500">{t.you}</span>
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg">
                            {/* 🔄 CHANGED: Use getUserInitial() */}
                            {getUserInitial()} 
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl rounded-tr-md px-4 py-3 sm:px-6 sm:py-4 shadow-xl shadow-blue-600/20">
                        <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-line">{message.content}</p>
                        {message.fileData && (
                            <div className="mt-2 sm:mt-3 text-blue-100 text-xs sm:text-sm flex items-center gap-2">
                                <FileText size={14} className="text-blue-200 flex-shrink-0" />
                                <span className="truncate">Attachment: {message.fileData.name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Assistant message
    return (
        <div className="flex gap-3 sm:gap-4">
            {/* Avatar - Hidden on mobile, shown on sm and up */}
            <div className="hidden sm:flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-600/30">
                    UB
                </div>
            </div>
            <div className="flex-1 min-w-0">
                <div className="mb-2">
                    <span className="text-xs font-semibold text-gray-500">Σ-Unlimited</span>
                </div>
                <div className="bg-white rounded-3xl rounded-tl-md px-4 py-3 sm:px-6 sm:py-4 shadow-lg border border-gray-100">
                    <p className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-line text-gray-800">{message.content}</p>
                    
                    {/* Source Documents Section - Only display if we have valid documents */}
                    {shouldDisplaySources && message.sourceDocuments && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText size={14} className="text-blue-600 flex-shrink-0" />
                                <span className="text-xs font-semibold text-gray-700">Sources</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent"></div>
                            </div>
                            <div className="space-y-2">
                                {message.sourceDocuments
                                    .filter(doc => doc.name !== "[No documents retrieved]")
                                    .map((doc, index) => (
                                    <div 
                                        key={index}
                                        className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-100 hover:bg-blue-100/50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-200 flex-shrink-0">
                                                <FileText size={14} className="text-blue-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">
                                                    {formatDocumentName(doc.name)}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate mt-0.5">
                                                    {doc.url}
                                                </p>
                                            </div>
                                        </div>
                                        <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="ml-3 p-2 bg-white hover:bg-blue-100 border border-blue-200 rounded-lg transition-all hover:scale-105 flex-shrink-0 group/link"
                                            title="View document"
                                        >
                                            <ExternalLink size={14} className="text-blue-600 group-hover/link:text-blue-700" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Action Buttons - Compact on mobile */}
                <div className="flex items-center gap-1 mt-2 ml-1">
                    <button 
                        onClick={() => copyToClipboard(message.content)} 
                        className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-lg transition-all hover:scale-110 group" 
                        title={t.copy}
                    >
                        <Copy size={12} className="sm:w-3.5 sm:h-3.5 text-gray-400 group-hover:text-gray-600" />
                    </button>
                    <button 
                        onClick={() => handleFeedback(message.id, 'liked')} 
                        className={`p-1.5 sm:p-2 rounded-lg transition-all hover:scale-110 group ${
                            message.feedback === 'liked' ? 'bg-green-50 text-green-500' : 'hover:bg-green-50'
                        }`} 
                        title={t.like}
                    >
                        <ThumbsUp size={12} className={`sm:w-3.5 sm:h-3.5 ${
                            message.feedback === 'liked' ? 'text-green-500' : 'text-gray-400 group-hover:text-green-500'
                        }`} />
                    </button>
                    <button 
                        onClick={() => handleFeedback(message.id, 'disliked')} 
                        className={`p-1.5 sm:p-2 rounded-lg transition-all hover:scale-110 group ${
                            message.feedback === 'disliked' ? 'bg-red-50 text-red-500' : 'hover:bg-red-50'
                        }`} 
                        title={t.dislike}
                    >
                        <ThumbsDown size={12} className={`sm:w-3.5 sm:h-3.5 ${
                            message.feedback === 'disliked' ? 'text-red-500' : 'text-gray-400 group-hover:text-red-500'
                        }`} />
                    </button>
                    {isLast && lastUserMessage && (
                        <button
                            onClick={() => regenerateResponse(lastUserMessage)}
                            className="p-1.5 sm:p-2 hover:bg-blue-50 rounded-lg transition-all hover:scale-110 group"
                            title={t.regenerate}
                        >
                            <RefreshCw size={12} className="sm:w-3.5 sm:h-3.5 text-gray-400 group-hover:text-blue-600" />
                        </button>
                    )}
                    {/* Mobile More Actions Dropdown */}
                    <div className="sm:hidden relative">
                        <button className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
                            <MoreVertical size={12} className="text-gray-400" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface ChatAreaProps {
    logic: UseChatLogicReturn;
}

export const ChatArea: React.FC<ChatAreaProps> = ({ logic }) => {
    const {
        setSidebarOpen, t, messages, isLoading,
        messagesEndRef, inputValue, setInputValue, textareaRef,
        handleSendMessage, selectedFiles, removeFile,
        fileInputRef, handleFileSelect, isRecording,
        startRecording, stopRecording,
        language, setLanguage, 
        LANGUAGES 
    } = logic;

    const canSendMessage = (!inputValue.trim() && selectedFiles.length === 0) || isLoading;

    return (
        <div className="flex-1 flex flex-col relative bg-gray-50/30">
            {/* Header - Compact on mobile */}
            <div className="h-14 sm:h-16 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-4 sm:px-6 shadow-sm flex-shrink-0 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    {/* Mobile Menu Button - Only show on mobile */}
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Open sidebar"
                    >
                        <Menu size={20} className="text-gray-600" />
                    </button>
                    
                    <div className="flex items-center">
                        <img 
                            src="/image.png"
                            alt="Σ-Unlimited Logo"
                            className="h-10 sm:h-12 w-auto" 
                        />
                    </div>
                </div>

                {/* Language Switcher - Compact on mobile */}
                <div className="flex items-center gap-1 sm:gap-2">
                    <Languages size={14} className="sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
                        className="px-2 py-1 sm:px-3 sm:py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs sm:text-sm min-w-16"
                    >
                        {(Object.values(LANGUAGES) as typeof LANGUAGES[keyof typeof LANGUAGES][]).map((lang) => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto pt-4 sm:pt-6">
                <div className="max-w-4xl mx-auto px-3 sm:px-6 pb-24">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-12 sm:mt-20 px-4">
                            <Sparkles size={36} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                            <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-700">{t.welcome}</h3>
                            <p className="text-sm sm:text-base text-gray-500">{t.startConversation}</p>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div key={message.id} className="mb-6 sm:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <MessageBubble
                                    message={message}
                                    isLast={index === messages.length - 1}
                                    logic={logic}
                                />
                            </div>
                        ))
                    )}

                    {/* Thinking Indicator */}
                    {isLoading && (
                        <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-10">
                            <div className="hidden sm:flex flex-col items-center flex-shrink-0">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-600/30">
                                    UB
                                </div>
                            </div>
                            <div className="flex-1">
                                <div className="mb-2">
                                    <span className="text-xs font-semibold text-gray-500">Σ-Unlimited</span>
                                </div>
                                <div className="bg-white rounded-3xl rounded-tl-md px-4 py-3 sm:px-6 sm:py-4 shadow-lg border border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <div className="flex space-x-1">
                                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                        <span className="text-gray-500 text-xs sm:text-sm">{t.thinking}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} className="h-0" />
                </div>
            </div>

            {/* Input Area Overlay */}
            <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent p-3 sm:p-6 flex-shrink-0">
                <div className="max-w-4xl mx-auto">

                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                        <div className="pb-3 sm:pb-4">
                            <div className="flex flex-wrap gap-2">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center gap-1 sm:gap-2 bg-blue-50 text-blue-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm border border-blue-200 shadow-sm">
                                        <FileText size={12} className="sm:w-3.5 sm:h-3.5 text-blue-600 flex-shrink-0" />
                                        <span className="max-w-20 sm:max-w-32 truncate font-medium">{file.name}</span>
                                        <button
                                            onClick={() => removeFile(index)}
                                            className="text-blue-600 hover:text-red-500 p-0.5 sm:p-1 rounded-full transition-colors flex-shrink-0"
                                            title="Remove file"
                                        >
                                            <X size={12} className="sm:w-3.5 sm:h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="relative flex items-center bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-gray-200 py-2 sm:py-3">

                        {/* Left Action Buttons */}
                        <div className="flex items-center gap-1 pl-3 sm:pl-4 flex-shrink-0">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileSelect}
                                multiple
                                accept="image/*,.pdf,.doc,.docx,.txt"
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2 sm:p-2.5 hover:bg-blue-50 rounded-lg sm:rounded-xl transition-all hover:scale-110 group"
                                title={t.uploadFiles}
                            >
                                <Upload size={16} className="sm:w-5 sm:h-5 text-gray-400 group-hover:text-blue-600" />
                            </button>
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl transition-all hover:scale-110 group ${
                                    isRecording
                                        ? 'bg-red-50 text-red-500'
                                        : 'hover:bg-blue-50 text-gray-400 group-hover:text-blue-600'
                                }`}
                                title={isRecording ? t.stopRecording : t.voiceInput}
                            >
                                {isRecording ? 
                                    <Square size={16} className="sm:w-5 sm:h-5" /> : 
                                    <Mic size={16} className="sm:w-5 sm:h-5" />
                                }
                            </button>
                        </div>

                        {/* Textarea Input */}
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder={t.askPlaceholder}
                            className="flex-1 bg-transparent px-2 outline-none resize-none max-h-32 text-sm sm:text-[15px] placeholder-gray-400 overflow-hidden leading-relaxed"
                            rows={1}
                            disabled={isLoading}
                        />

                        {/* Send Button */}
                        <div className="pr-2 sm:pr-3 flex-shrink-0">
                            <button
                                onClick={handleSendMessage}
                                className="p-2.5 sm:p-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg sm:rounded-xl transition-all shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 active:scale-95"
                                disabled={canSendMessage}
                            >
                                {isLoading ? (
                                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Send size={16} className="sm:w-4.5 sm:h-4.5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Footer Notice */}
                    <p className="text-center text-[10px] sm:text-xs text-gray-500 mt-2 sm:mt-3 px-2">
                        {t.verifyInfo}
                    </p>
                </div>
            </div>
        </div>
    );
}
