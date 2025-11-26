import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
    const { t, copyToClipboard, handleFeedback, messages, regenerateResponse, getUserInitial } = logic; 

    const messageIndex = messages.findIndex(m => m.id === message.id);
    const lastUserMessage = messages.slice(0, messageIndex).reverse().find(m => m.role === 'user');

    // Format document name for display
    const formatDocumentName = (name: string) => {
        return name
            .replace(/\.[^/.]+$/, "") 
            .replace(/[_-]/g, " ") 
            .replace(/\b\w/g, l => l.toUpperCase()); 
    };

    // Check if we should display source documents
    const shouldDisplaySources = message.sourceDocuments && 
        message.sourceDocuments.length > 0 && 
        !message.sourceDocuments.every(doc => doc.name === "[No documents retrieved]");

    // --- User Message ---
    if (message.role === 'user') {
        return (
            <div className="flex justify-end w-full group">
                <div className="max-w-[90%] sm:max-w-2xl">
                    <div className="flex items-center justify-end gap-2 mb-2">
                        <span className="text-xs font-semibold text-gray-500">{t.you}</span>
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-lg">
                            {getUserInitial()} 
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl rounded-tr-md px-4 py-3 sm:px-6 sm:py-4 shadow-xl shadow-blue-600/20">
                        <div className="text-sm sm:text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                            </ReactMarkdown>
                        </div>
                        {message.fileData && (
                            <div className="mt-2 sm:mt-3 text-blue-100 text-xs sm:text-sm flex items-center gap-2 overflow-hidden">
                                <FileText size={14} className="text-blue-200 flex-shrink-0" />
                                <span className="truncate">{message.fileData.name}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // --- Assistant Message ---
    return (
        <div className="flex gap-3 sm:gap-4 w-full max-w-full">
            {/* Avatar */}
            <div className="hidden sm:flex flex-col items-center flex-shrink-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-600/30">
                    UB
                </div>
            </div>
            
            <div className="flex-1 min-w-0 max-w-full">
                <div className="mb-2">
                    <span className="text-xs font-semibold text-gray-500">Σ-Unlimited</span>
                </div>
                
                <div className="bg-white rounded-3xl rounded-tl-md px-4 py-3 sm:px-6 sm:py-4 shadow-lg border border-gray-100 w-full overflow-hidden">
                    {/* Markdown Content */}
                    <div className="text-sm sm:text-[15px] leading-relaxed text-gray-800 break-words">
                         <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                                strong: ({node, ...props}) => <span className="font-bold text-gray-900" {...props} />,
                                b: ({node, ...props}) => <span className="font-bold text-gray-900" {...props} />,
                                ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 space-y-1" {...props} />,
                                ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 space-y-1" {...props} />,
                                li: ({node, ...props}) => <li className="pl-1" {...props} />,
                                p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                                h1: ({node, ...props}) => <h1 className="text-lg font-bold mb-2 mt-4" {...props} />,
                                h2: ({node, ...props}) => <h2 className="text-base font-bold mb-2 mt-3" {...props} />,
                                h3: ({node, ...props}) => <h3 className="text-sm font-bold mb-1 mt-2" {...props} />,
                                code: ({node, ...props}) => <code className="bg-gray-100 rounded px-1.5 py-0.5 text-pink-500 font-mono text-xs" {...props} />,
                                pre: ({node, ...props}) => <pre className="bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-xs font-mono" {...props} />,
                                a: ({node, ...props}) => <a className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2 text-gray-600" {...props} />,
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>
                    
                    {/* Source Documents Section - Clickable Container, Hidden URL Text */}
                    {shouldDisplaySources && message.sourceDocuments && (
                        <div className="mt-4 pt-4 border-t border-gray-100 w-full">
                            <div className="flex items-center gap-2 mb-3">
                                <FileText size={14} className="text-blue-600 flex-shrink-0" />
                                <span className="text-xs font-semibold text-gray-700 flex-shrink-0">Sources</span>
                                <div className="flex-1 h-px bg-gradient-to-r from-blue-200 to-transparent"></div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-2 w-full">
                                {message.sourceDocuments
                                    .filter(doc => doc.name !== "[No documents retrieved]")
                                    .map((doc, index) => {
                                    
                                    const fileUrl = doc.url || '#';
                                    
                                    return (
                                        <a 
                                            key={index}
                                            href={fileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full max-w-full no-underline"
                                            title="Click to view document"
                                        >
                                            <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors group cursor-pointer shadow-sm hover:shadow-md">
                                                <div className="flex items-center gap-3 flex-1 min-w-0 overflow-hidden">
                                                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-blue-200 flex-shrink-0 group-hover:border-blue-300 transition-colors">
                                                        <FileText size={14} className="text-blue-600" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-gray-800 truncate block group-hover:text-blue-700 transition-colors">
                                                            {formatDocumentName(doc.name)}
                                                        </p>
                                                        {/* Hidden URL text */}
                                                    </div>
                                                </div>
                                                
                                                {/* External Link Icon as visual cue */}
                                                <div className="ml-3 p-1.5 bg-white rounded-lg border border-blue-100 group-hover:border-blue-300 transition-all flex-shrink-0">
                                                    <ExternalLink size={14} className="text-blue-500 group-hover:text-blue-700" />
                                                </div>
                                            </div>
                                        </a>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-1 mt-2 ml-1 flex-wrap">
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
        LANGUAGES, getUserInitial
    } = logic;

    const canSendMessage = (!inputValue.trim() && selectedFiles.length === 0) || isLoading;

    return (
        <div className="flex-1 flex flex-col relative bg-gray-50/30 h-full w-full overflow-hidden">
            {/* Header */}
            <div className="h-14 sm:h-16 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 flex items-center justify-between px-4 sm:px-6 shadow-sm flex-shrink-0 sticky top-0 z-10 w-full">
                <div className="flex items-center gap-3">
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
                            className="h-8 sm:h-12 w-auto object-contain" 
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                    <Languages size={14} className="sm:w-4 sm:h-4 text-gray-500 flex-shrink-0" />
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as 'en' | 'ar')}
                        className="px-2 py-1 sm:px-3 sm:py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-xs sm:text-sm min-w-[4rem]"
                    >
                        {(Object.values(LANGUAGES) as typeof LANGUAGES[keyof typeof LANGUAGES][]).map((lang) => (
                            <option key={lang.code} value={lang.code}>{lang.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto pt-4 sm:pt-6 w-full">
                <div className="max-w-4xl mx-auto px-3 sm:px-6 pb-24 w-full">
                    {messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-12 sm:mt-20 px-4">
                            <Sparkles size={36} className="sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 text-gray-300" />
                            <h3 className="text-lg sm:text-xl font-semibold mb-2 text-gray-700">{t.welcome}</h3>
                            <p className="text-sm sm:text-base text-gray-500">{t.startConversation}</p>
                        </div>
                    ) : (
                        messages.map((message, index) => (
                            <div key={message.id} className="mb-6 sm:mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
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
                        <div className="flex gap-3 sm:gap-4 mb-6 sm:mb-10 w-full">
                            <div className="hidden sm:flex flex-col items-center flex-shrink-0">
                                <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-blue-600/30">
                                    UB
                                </div>
                            </div>
                            <div className="flex-1 max-w-full">
                                <div className="mb-2">
                                    <span className="text-xs font-semibold text-gray-500">Σ-Unlimited</span>
                                </div>
                                <div className="bg-white rounded-3xl rounded-tl-md px-4 py-3 sm:px-6 sm:py-4 shadow-lg border border-gray-100 inline-block">
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
            <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent p-3 sm:p-6 flex-shrink-0 w-full">
                <div className="max-w-4xl mx-auto w-full">

                    {/* Selected Files Preview */}
                    {selectedFiles.length > 0 && (
                        <div className="pb-3 sm:pb-4">
                            <div className="flex flex-wrap gap-2">
                                {selectedFiles.map((file, index) => (
                                    <div key={index} className="flex items-center gap-1 sm:gap-2 bg-blue-50 text-blue-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm border border-blue-200 shadow-sm max-w-full">
                                        <FileText size={12} className="sm:w-3.5 sm:h-3.5 text-blue-600 flex-shrink-0" />
                                        <span className="truncate max-w-[120px] sm:max-w-[200px] font-medium">{file.name}</span>
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

                    <div className="relative flex items-center bg-white rounded-2xl sm:rounded-3xl shadow-xl sm:shadow-2xl border border-gray-200 py-2 sm:py-3 w-full">

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
                            className="flex-1 bg-transparent px-2 outline-none resize-none max-h-32 text-sm sm:text-[15px] placeholder-gray-400 overflow-hidden leading-relaxed min-w-0"
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
