import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Groq from "groq-sdk";

// --- Type Definitions ---
export interface Chat {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
}

export interface FileData {
  name: string;
  type: string;
  url?: string;
}

export interface SourceDocument {
  name: string;
  url: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type: 'text' | 'file';
  fileData?: FileData;
  files?: File[];
  feedback?: 'liked' | 'disliked' | null;
  sourceDocuments?: SourceDocument[];
}

export interface BackendConfig {
  backendUrl: string;
  authToken: string | null;
}

export interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  chatId: string;
}

// --- Backend Data Interfaces ---
interface BackendMessage {
  content: string;
  is_user: boolean;
  timestamp: string;
}

interface BackendConversation {
  id: number;
  title?: string;
  created_at: string;
  messages: BackendMessage[];
}

// --- Language Configuration ---
export const LANGUAGES = {
  en: {
    name: 'English',
    code: 'en',
    dir: 'ltr',
    translations: {
      newChat: 'New Chat',
      searchConversations: 'Search conversations...',
      welcome: 'Welcome to Σ-Unlimited',
      startConversation: 'Start a conversation by typing a message or uploading a file.',
      askPlaceholder: 'Ask Σ-Unlimited anything...',
      thinking: 'Thinking...',
      you: 'You',
      copy: 'Copy',
      like: 'Like',
      dislike: 'Dislike',
      share: 'Share',
      regenerate: 'Regenerate',
      verifyInfo: 'Σ-Unlimited can make mistakes. Please verify important information.',
      uploadFiles: 'Upload files (Image, PDF, DOCX)',
      voiceInput: 'Start Voice Input',
      stopRecording: 'Stop Recording',
      deleteChat: 'Delete Chat',
      today: 'Today',
      yesterday: 'Yesterday',
      lastWeek: 'Last Week',
      older: 'Older',
      transcribing: 'Transcribing audio...'
    }
  },
  ar: {
    name: 'العربية',
    code: 'ar',
    dir: 'rtl',
    translations: {
      newChat: 'محادثة جديدة',
      searchConversations: 'البحث في المحادثات...',
      welcome: 'مرحباً بك في Σ-Unlimited',
      startConversation: 'ابدأ محادثة بكتابة رسالة أو رفع ملف.',
      askPlaceholder: 'اسأل Σ-Unlimited أي شيء...',
      thinking: 'جاري التفكير...',
      you: 'أنت',
      copy: 'نسخ',
      like: 'إعجاب',
      dislike: 'عدم إعجاب',
      share: 'مشاركة',
      regenerate: 'إعادة توليد',
      verifyInfo: 'Σ-Unlimited قد يخطئ. يرجى التحقق من المعلومات المهمة.',
      uploadFiles: 'رفع ملفات (صورة، PDF، DOCX)',
      voiceInput: 'بدء الإدخال الصوتي',
      stopRecording: 'إيقاف التسجيل',
      deleteChat: 'حذف المحادثة',
      today: 'اليوم',
      yesterday: 'أمس',
      lastWeek: 'الأسبوع الماضي',
      older: 'أقدم',
      transcribing: 'جاري النسخ الصوتي...'
    }
  }
};

const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY,
  dangerouslyAllowBrowser: true
});

// --- Core Helper Function: File Conversion ---
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result?.toString().split(',')[1];
      if (!base64Data) {
        return reject(new Error('Failed to read file as Base64'));
      }
      resolve(base64Data);
    };
    reader.onerror = () => reject(new Error('FileReader failed to read file.'));
    reader.readAsDataURL(file);
  });
}

// --- Date/Timestamp Helper ---
const getTimestampGroup = (dateString: string, translations: typeof LANGUAGES['en']['translations']): string => {
  const date = new Date(dateString);
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * oneDay;

  const isSameDay = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  const isYesterday = (now.getTime() - date.getTime() < 2 * oneDay) && !isSameDay;
  const isLastWeek = (now.getTime() - date.getTime() < sevenDays);

  if (isSameDay) return translations.today;
  if (isYesterday) return translations.yesterday;
  if (isLastWeek) return translations.lastWeek;
  return translations.older;
};

// --- Initial State ---
const initialLanguage = 'en';
const initialTranslations = LANGUAGES[initialLanguage].translations;
const initialChatId = 'temp-new-chat';

const createInitialChat = (translations: typeof initialTranslations, id: string): Chat => ({
  id: id,
  title: translations.newChat,
  timestamp: translations.today,
  messages: []
});

const initialChat: Chat = createInitialChat(initialTranslations, initialChatId);

// --- Custom Hook ---
export function useChatLogic(authToken: string | null) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ar'>(initialLanguage);
  const [chats, setChats] = useState<Chat[]>(() => {
    return [createInitialChat(initialTranslations, initialChatId)];
  });
  const [currentChatId, setCurrentChatId] = useState(initialChatId);
  const [messages, setMessages] = useState<Message[]>(initialChat.messages);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [backendConfig, setBackendConfig] = useState<BackendConfig>({
    backendUrl: 'https://gx5cdmd5-8000.inc1.devtunnels.ms',
    authToken: authToken,
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const t = LANGUAGES[language].translations;
  const currentLanguageDir = LANGUAGES[language].dir;

  const currentChat = useMemo(() =>
    chats.find(chat => chat.id === currentChatId),
    [chats, currentChatId]
  );

  const groupedChats = useMemo(() => {
    const translations = LANGUAGES[language].translations;
    return chats.reduce((acc: Record<string, Chat[]>, chat: Chat) => {
      if (chat.id.startsWith('temp-')) {
        return acc;
      }
      const groupKey = chat.timestamp;
      if (!acc[groupKey]) {
        acc[groupKey] = [];
      }
      acc[groupKey].push(chat);
      return acc;
    }, {} as Record<string, Chat[]>);
  }, [chats, language]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  const updateChatMessages = useCallback((chatId: string, newMessages: Message[]) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, messages: newMessages } : chat
    ));
  }, []);

  const updateChatTitle = useCallback((chatId: string, newTitle: string) => {
    setChats(prev => prev.map(chat =>
      chat.id === chatId ? { ...chat, title: newTitle } : chat
    ));
  }, []);

  const selectChat = useCallback((chatId: string) => {
    setCurrentChatId(chatId);
    const chat = chats.find(c => c.id === chatId);
    setMessages(chat?.messages || []);
    setSelectedFiles([]);
  }, [chats]);

  const createNewChat = useCallback((selectNew: boolean = true) => {
    const newChatId = `temp-${Date.now()}`;
    const newChat: Chat = createInitialChat(t, newChatId);
    setChats(prev => [newChat, ...prev.filter(c => !c.id.startsWith('temp-'))]);
    if (selectNew) {
      setCurrentChatId(newChat.id);
      setMessages([]);
      setSelectedFiles([]);
      setInputValue('');
    }
    return newChat;
  }, [t]);

  const deleteChat = useCallback(async (chatId: string) => {
    try {
        if (!chatId.startsWith('temp-')) {
        const deleteEndpoint = `${backendConfig.backendUrl}/api/delete/${chatId}/`;
        const response = await fetch(deleteEndpoint, {
            method: 'DELETE',
            headers: {
            'Content-Type': 'application/json',
            'Authorization': backendConfig.authToken || '',
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to delete chat: ${response.status} ${response.statusText}`);
        }
        }

        setChats(prev => prev.filter(chat => chat.id !== chatId));

        if (currentChatId === chatId) {
        const remainingChats = chats.filter(c => c.id !== chatId);
        if (remainingChats.length > 0) {
            const realChats = remainingChats.filter(c => !c.id.startsWith('temp-'));
            if (realChats.length > 0) {
            selectChat(realChats[0].id);
            } else {
            selectChat(initialChatId);
            }
        } else {
            createNewChat();
        }
        }
        setContextMenu(null);
    } catch (error) {
        console.error("Error deleting chat:", error);
    }
    }, [backendConfig.backendUrl, backendConfig.authToken, currentChatId, chats, selectChat, createNewChat]);


  const handleContextMenu = useCallback((e: React.MouseEvent, chatId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      chatId
    });
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, []);

  const handleFeedback = useCallback((messageId: string, feedback: 'liked' | 'disliked') => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
    setChats(prevChats => prevChats.map(chat =>
      chat.id === currentChatId
        ? {
          ...chat,
          messages: chat.messages.map(msg =>
            msg.id === messageId ? { ...msg, feedback } : msg
          )
        }
        : chat
    ));
  }, [currentChatId]);

  const mapBackendChatsToFrontend = useCallback((backendHistory: BackendConversation[]): Chat[] => {
    if (!backendHistory || backendHistory.length === 0) return [];
    const translations = LANGUAGES[language].translations;

    return backendHistory.map((conversation: BackendConversation) => {
      const messages: Message[] = (conversation.messages || []).map((msg: BackendMessage, index: number): Message => ({
        id: `${conversation.id}-${index}`,
        role: msg.is_user ? 'user' : 'assistant',
        content: msg.content || '...',
        type: 'text',
        feedback: null,
      }));

      let title = conversation.title;
      if (!title && messages.length > 0) {
        const firstUserMessage = messages.find((m: Message) => m.role === 'user');
        if (firstUserMessage?.content) {
          title = firstUserMessage.content.substring(0, 30) + (firstUserMessage.content.length > 30 ? '...' : '');
        }
      }
      title = title || translations.newChat;

      const timestampGroup = getTimestampGroup(conversation.created_at, translations);

      return {
        id: String(conversation.id),
        title: title,
        timestamp: timestampGroup,
        messages: messages,
      };
    });
  }, [language]);

  const loadChatHistory = useCallback(async (token: string | null) => {
    setIsHistoryLoading(true);
    if (!token) {
      console.warn("Cannot load chat history: Authentication token is missing.");
      setIsHistoryLoading(false);
      return;
    }

    try {
      const historyEndpoint = `${backendConfig.backendUrl}/api/history/`;
      console.log("Fetching chat history from:", historyEndpoint);

      const response = await fetch(historyEndpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load history: ${response.statusText} (${response.status})`);
      }

      const backendHistory: BackendConversation[] = await response.json();
      console.log("Raw backend history:", backendHistory);

      let frontendChats = mapBackendChatsToFrontend(backendHistory);
      console.log("Mapped frontend chats:", frontendChats);

      frontendChats.sort((a, b) => parseInt(b.id) - parseInt(a.id));

      setChats(prevChats => {
        const tempChat = prevChats.find(c => c.id.startsWith('temp-')) || createInitialChat(t, initialChatId);
        const filteredFetchedChats = frontendChats.filter(chat => !chat.id.startsWith('temp-'));
        return [tempChat, ...filteredFetchedChats];
      });

    } catch (error) {
      console.error('Error loading chat history:', error);
      setChats(prevChats => {
        if (!prevChats.find(c => c.id.startsWith('temp-'))) {
          return [createInitialChat(t, initialChatId), ...prevChats];
        }
        return prevChats;
      });
    } finally {
      setIsHistoryLoading(false);
    }
  }, [backendConfig.backendUrl, mapBackendChatsToFrontend, t]);

  const generateResponse = useCallback(async (userPrompt: string, files: File[] = []): Promise<{ content: string, conversationId?: number, sourceDocuments?: SourceDocument[] }> => {
    const token = authToken || backendConfig.authToken;
    if (!token) {
      return { content: "Authentication required. Please log in to start chatting." };
    }

    try {
      setIsLoading(true);
      const chatEndpoint = `${backendConfig.backendUrl}/api/rag/`;
      
      const payload: any = {
        prompt: userPrompt.trim() || 'Hello'
      };

      const isNewChat = currentChatId.startsWith('temp-');
      let conversationIdNum: number | undefined;

      if (!isNewChat) {
        conversationIdNum = parseInt(currentChatId, 10);
        if (!isNaN(conversationIdNum) && conversationIdNum > 0) {
          payload.conversation_id = conversationIdNum;
        } else {
          console.warn('Invalid conversation ID format, proceeding without conversation_id:', currentChatId);
          conversationIdNum = undefined;
        }
      }

      const response = await fetch(chatEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
        body: JSON.stringify(payload)
      });

      const responseText = await response.text();

      if (!response.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          errorData = { detail: responseText || response.statusText };
        }

        if (response.status === 401 || response.status === 403) {
          return { content: `Authorization Failed: ${errorData.detail || 'Invalid token or permissions.'}` };
        }

        throw new Error(`API Error ${response.status}: ${JSON.stringify(errorData)}`);
      }

      const result = JSON.parse(responseText);
      const responseContent = result.content || result.response || result.text || "No response text found in API output.";
      const sourceDocuments = result.source_documents || [];

      return {
        content: responseContent,
        conversationId: result.conversation_id,
        sourceDocuments: sourceDocuments
      };

    } catch (error) {
      console.error('Error generating response from backend:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { content: `I apologize, but I encountered an error: ${errorMessage}. Please try again.` };
    } finally {
      setIsLoading(false);
    }
  }, [authToken, backendConfig.backendUrl, backendConfig.authToken, currentChatId]);

  const regenerateResponse = useCallback(async (lastUserMessage: Message) => {
    if (isLoading) return;

    const messagesWithoutLastAI = messages.filter((msg, index, arr) => {
      if (index === arr.length - 1 && msg.role === 'assistant') {
        return false;
      }
      return true;
    });

    setMessages(messagesWithoutLastAI);
    updateChatMessages(currentChatId, messagesWithoutLastAI);

    try {
      const { content: response, sourceDocuments } = await generateResponse(lastUserMessage.content, lastUserMessage.files || []);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        type: 'text',
        sourceDocuments: sourceDocuments
      };

      const finalMessages = [...messagesWithoutLastAI, aiMessage];
      setMessages(finalMessages);
      updateChatMessages(currentChatId, finalMessages);
    } catch (error) {
      console.error('Error regenerating response:', error);
    }
  }, [messages, currentChatId, isLoading, updateChatMessages, generateResponse]);

  const handleSendMessage = async () => {
    if ((!inputValue.trim() && selectedFiles.length === 0) || isLoading) return;

    const currentInput = inputValue;
    const currentFiles = selectedFiles;
    const isNewChatBeforeSend = currentChatId.startsWith('temp-');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      type: currentFiles.length > 0 ? 'file' : 'text',
      fileData: currentFiles.length > 0 ? {
        name: currentFiles.map(f => f.name).join(', '),
        type: currentFiles[0].type
      } : undefined,
      files: currentFiles
    };

    const updatedMessagesWithUser = [...messages, userMessage];
    setMessages(updatedMessagesWithUser);
    updateChatMessages(currentChatId, updatedMessagesWithUser);

    setInputValue('');
    setSelectedFiles([]);

    try {
      setIsLoading(true);
      const { content: responseContent, conversationId, sourceDocuments } = await generateResponse(currentInput, currentFiles);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        type: 'text',
        sourceDocuments: sourceDocuments
      };

      let finalChatId = currentChatId;

      if (isNewChatBeforeSend && conversationId) {
        const newChatId = String(conversationId);
        finalChatId = newChatId;

        setChats(prev => prev.map(c =>
          c.id === currentChatId ? {
            ...c,
            id: newChatId,
            timestamp: getTimestampGroup(new Date().toISOString(), t)
          } : c
        ));
        setCurrentChatId(newChatId);
      }

      setMessages(prev => {
        const userMessageInPrev = prev.find(m => m.id === userMessage.id);
        const currentMsgs = userMessageInPrev ? prev : [...prev, userMessage];
        const finalMessages = [...currentMsgs, aiMessage];
        updateChatMessages(finalChatId, finalMessages);
        return finalMessages;
      });

      if (isNewChatBeforeSend && currentChat?.title === t.newChat) {
        const newTitle = currentInput.substring(0, 30) + (currentInput.length > 30 ? '...' : '');
        updateChatTitle(finalChatId, newTitle || 'Chat with files');
      }

    } catch (error) {
      console.error('Error in handleSendMessage:', error);
      setMessages(messages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
    event.target.value = '';
  };

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // ✅ UPDATED: Groq Whisper Integration
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        setIsTranscribing(true);
        
        try {
          // Create audio blob from chunks
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          // Convert blob to File object for Groq API
          const audioFile = new File([audioBlob], "recording.webm", { type: 'audio/webm' });
          
          // Transcribe using Groq Whisper
          const transcription = await groq.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-large-v3",
            temperature: 0,
            response_format: "verbose_json",
          });
          
          // Set the transcribed text to input
          setInputValue(prev => prev + (prev.trim() ? '\n' : '') + transcription.text);
        } catch (error) {
          console.error('Error transcribing audio:', error);
          setInputValue(prev => prev + (prev.trim() ? '\n' : '') + "Error transcribing audio. Please try again.");
        } finally {
          setIsTranscribing(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    setBackendConfig(prev => ({ ...prev, authToken: authToken }));
  }, [authToken]);

  useEffect(() => {
    if (authToken) {
      console.log("Auth token available, loading chat history...");
      loadChatHistory(authToken);
    } else {
      console.log("No auth token available, using initial chat");
      setChats([createInitialChat(t, initialChatId)]);
      setCurrentChatId(initialChatId);
      setMessages([]);
    }
  }, [authToken, loadChatHistory, t]);

  useEffect(() => {
    const chat = chats.find(c => c.id === currentChatId);
    setMessages(chat?.messages || []);
    setSelectedFiles([]);
  }, [currentChatId, chats]);

  useEffect(() => {
    scrollToBottom();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const newHeight = Math.min(textareaRef.current.scrollHeight, 192);
      textareaRef.current.style.height = `${newHeight}px`;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [messages, selectedFiles, inputValue]);

  useEffect(() => {
    document.documentElement.dir = currentLanguageDir;
  }, [currentLanguageDir]);

  return {
    LANGUAGES,
    sidebarOpen, setSidebarOpen,
    language, setLanguage,
    chats,
    currentChatId,
    messages,
    inputValue, setInputValue,
    isRecording,
    isTranscribing,
    selectedFiles,
    backendConfig, setBackendConfig,
    isConfigOpen, setIsConfigOpen,
    isLoading,
    isHistoryLoading,
    contextMenu, setContextMenu,
    t,
    currentChat,
    groupedChats,
    fileInputRef,
    messagesEndRef,
    contextMenuRef,
    textareaRef,
    createNewChat,
    selectChat,
    deleteChat,
    handleContextMenu,
    copyToClipboard,
    handleFeedback,
    regenerateResponse,
    handleSendMessage,
    handleFileSelect,
    removeFile,
    startRecording,
    stopRecording,
  };
}

export type UseChatLogicReturn = ReturnType<typeof useChatLogic>;