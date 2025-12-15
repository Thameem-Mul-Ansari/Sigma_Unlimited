import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Groq from "groq-sdk";
import { UserData } from './useAuth'; 

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
interface QueryLog {
  prompt: string;
  response: string;
  timestamp: string;
  source_documents?: (string | { name: string; url: string })[];
}

interface BackendConversation {
  id: number;
  title?: string;
  created_at: string;
  query_logs: QueryLog[];
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

// --- Helper Functions ---
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

// --- Main Custom Hook ---
export function useChatLogic(authToken: string | null, userData: UserData | null) {
  // State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [language, setLanguage] = useState<'en' | 'ar'>(initialLanguage);
  const [chats, setChats] = useState<Chat[]>([createInitialChat(initialTranslations, initialChatId)]);
  const [currentChatId, setCurrentChatId] = useState(() => localStorage.getItem('activeChatId') || initialChatId);
  const [messages, setMessages] = useState<Message[]>(initialChat.messages);
  const [inputValue, setInputValue] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [backendConfig, setBackendConfig] = useState<BackendConfig>({
    backendUrl: 'https://h43mkhn4-8000.inc1.devtunnels.ms',
    authToken: authToken,
  });
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const previousChatId = useRef(currentChatId);

  // Derived values
  const t = LANGUAGES[language].translations;
  const currentLanguageDir = LANGUAGES[language].dir;

  const currentChat = useMemo(() => 
    chats.find(chat => chat.id === currentChatId),
    [chats, currentChatId]
  );

  const groupedChats = useMemo(() => {
    const translations = LANGUAGES[language].translations;
    return chats.reduce((acc: Record<string, Chat[]>, chat: Chat) => {
      if (chat.id.startsWith('temp-')) return acc;
      const groupKey = chat.timestamp;
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(chat);
      return acc;
    }, {});
  }, [chats, language]);

  // Utility functions
  const getUserInitial = useCallback(() => 
    userData?.username ? userData.username.charAt(0).toUpperCase() : 'U',
    [userData]
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  // Save active chat ID to localStorage
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem('activeChatId', currentChatId);
    }
  }, [currentChatId]);

  // Chat management functions
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
    setTimeout(scrollToBottom, 100);
  }, []);

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
        ? { ...chat, messages: chat.messages.map(msg => msg.id === messageId ? { ...msg, feedback } : msg) }
        : chat
    ));
  }, [currentChatId]);

  // Source Documents Helpers
  const mapSourceDocuments = useCallback((backendDocs: any[] | undefined): SourceDocument[] => {
    if (!backendDocs || !Array.isArray(backendDocs)) return [];

    return backendDocs.map((doc) => {
      if (typeof doc === 'object' && doc !== null && 'name' in doc && 'url' in doc) {
        return { name: doc.name, url: doc.url };
      }
      if (typeof doc === 'string') {
        return { name: doc, url: `${backendConfig.backendUrl}/media/${doc}` };
      }
      return { name: 'Unknown Document', url: '#' };
    });
  }, [backendConfig.backendUrl]);

  const mapBackendChatsToFrontend = useCallback((backendHistory: BackendConversation[]): Chat[] => {
    if (!backendHistory || backendHistory.length === 0) return [];
    const translations = LANGUAGES[language].translations;

    return backendHistory.map((conversation: BackendConversation) => {
      const frontendMessages: Message[] = [];

      (conversation.query_logs || []).forEach((log: QueryLog, index: number) => {
        frontendMessages.push({
          id: `user-${conversation.id}-${index}`,
          role: 'user',
          content: log.prompt || '...',
          type: 'text',
          feedback: null,
        });

        const sourceDocs: SourceDocument[] = mapSourceDocuments(log.source_documents);

        frontendMessages.push({
          id: `ai-${conversation.id}-${index}`,
          role: 'assistant',
          content: log.response || '...',
          type: 'text',
          feedback: null,
          sourceDocuments: sourceDocs
        });
      });

      let title = conversation.title;
      if (!title && frontendMessages.length > 0) {
        const firstUserMessage = frontendMessages.find(m => m.role === 'user');
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
        messages: frontendMessages,
      };
    });
  }, [language, mapSourceDocuments]);

  // Load History
  const loadChatHistory = useCallback(async (token: string | null) => {
    setIsHistoryLoading(true);
    if (!token) {
      console.warn("Cannot load chat history: Authentication token is missing.");
      setIsHistoryLoading(false);
      return;
    }

    try {
      const historyEndpoint = `${backendConfig.backendUrl}/api/history/`;
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
      const frontendChats = mapBackendChatsToFrontend(backendHistory);
      frontendChats.sort((a, b) => parseInt(b.id) - parseInt(a.id));

setChats(() => {
  // Always create a fresh temp chat
  const tempChat = createInitialChat(t, initialChatId);

  // Only keep real saved chats from backend
  const realChats = frontendChats.filter(chat => !chat.id.startsWith('temp-'));

  // Decide which chat should be active
  let activeIdToSet = initialChatId;
  const savedActiveId = localStorage.getItem('activeChatId');

  if (savedActiveId && !savedActiveId.startsWith('temp-')) {
    if (realChats.some(c => c.id === savedActiveId)) {
      activeIdToSet = savedActiveId;
    } else {
      localStorage.removeItem('activeChatId'); // Invalid saved ID
    }
  }

  // If no valid saved chat, open the most recent real chat
  if (activeIdToSet === initialChatId && realChats.length > 0) {
    const latestChat = realChats.sort((a, b) => parseInt(b.id) - parseInt(a.id))[0];
    activeIdToSet = latestChat.id;
    localStorage.setItem('activeChatId', activeIdToSet);
  }

  // Actually set the active chat
  setCurrentChatId(activeIdToSet);

  // Return: temp chat on top + all real chats
  return [tempChat, ...realChats];
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

  // --- FIXED: Generate Response with Working Upload Logic ---
  const generateResponse = useCallback(async (userPrompt: string, files: File[] = []): Promise<{ content: string, conversationId?: number, sourceDocuments?: SourceDocument[] }> => {
    const token = authToken || backendConfig.authToken;
    if (!token) {
      return { content: "Authentication required. Please log in to start chatting." };
    }

    try {
      setIsLoading(true);
      
      const isNewChat = currentChatId.startsWith('temp-');
      let conversationIdForRequest: number | null = isNewChat ? null : parseInt(currentChatId, 10);

      // --- STEP 1: UPLOAD FILES (If present) ---
      if (files.length > 0) {
        // For new chats with files, we need to create a conversation first
        if (!conversationIdForRequest) {
          // Create a minimal conversation to get an ID
          const createResponse = await fetch(`${backendConfig.backendUrl}/api/rag/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': token,
            },
            body: JSON.stringify({
              prompt: ".",
              conversation_id: null,
            })
          });

          if (createResponse.ok) {
            const createResult = await createResponse.json();
            conversationIdForRequest = createResult.conversation_id;
            console.log('🆕 Created conversation for upload:', conversationIdForRequest);
          } else {
            throw new Error('Failed to create conversation for file upload');
          }
        }

        // Now upload files with the conversation_id
        const uploadEndpoint = `${backendConfig.backendUrl}/api/upload/`;
        const formData = new FormData();
        
        files.forEach(file => {
          formData.append('files', file);
        });

        // Always send conversation_id as string (matching Postman)
        formData.append('conversation_id', conversationIdForRequest!.toString());

        console.log('📤 Uploading files to conversation:', conversationIdForRequest);

        const uploadResponse = await fetch(uploadEndpoint, {
          method: 'POST',
          headers: { 'Authorization': token },
          body: formData
        });

        if (!uploadResponse.ok) {
          const errText = await uploadResponse.text();
          throw new Error(`Upload Failed (${uploadResponse.status}): ${errText}`);
        }
        
        await uploadResponse.json(); // Process response if needed
        console.log('✅ Files uploaded successfully');
      }
      const trinityAuth = localStorage.getItem('trinityAuth') || 'AuthTokenMissing Maybe He is user';
      const LMS_JWT_Token = localStorage.getItem('LMS_JWT_Token') || 'LMS_JWT_Token_Missing';
      const LMSdataStr = localStorage.getItem('LMSdata');

// Step 2: Parse the JSON string into a JavaScript object
// (Add error handling in production code)
const LMSdata = JSON.parse(LMSdataStr || '{}');

// Step 3: Access strEmpID (it's nested under data[0])
const strEmpID = LMSdata.data[0].strEmpID;
      // --- STEP 2: CHAT (RAG) ---
      const chatEndpoint = `${backendConfig.backendUrl}/api/rag/`;
      console.log('LMS_JWT_Token:', LMS_JWT_Token);
      console.log('strEmpID:', strEmpID);
      const payload: any = {
        prompt: userPrompt.trim() || 'Hello',
        conversation_id: conversationIdForRequest,
        trinity_auth: trinityAuth,
        strEmpID: strEmpID,
        lms_jwt_token: LMS_JWT_Token
      };

      console.log('💬 Sending chat to conversation:', payload.conversation_id);

      const chatResponse = await fetch(chatEndpoint, {
        
        method: 'POST',
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token,
        },
        body: JSON.stringify(payload)
      });

      if (!chatResponse.ok) {
        const errText = await chatResponse.text();
        throw new Error(`Chat API Failed (${chatResponse.status}): ${errText}`);
      }

      const result = await chatResponse.json();
      
      // Return the conversation ID that was used
      const finalConversationId = result.conversation_id || conversationIdForRequest;
      
      return {
        content: result.content || result.response || result.text || "No response.",
        conversationId: finalConversationId,
        sourceDocuments: mapSourceDocuments(result.source_documents)
      };

    } catch (error) {
      console.error('Error generating response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { content: `Error: ${errorMessage}. Please try again.` };
    } finally {
      setIsLoading(false);
    }
  }, [authToken, backendConfig.backendUrl, backendConfig.authToken, currentChatId, mapSourceDocuments]);

  const regenerateResponse = useCallback(async (lastUserMessage: Message) => {
    if (isLoading) return;

    const messagesWithoutLastAI = messages.filter((msg, index, arr) => 
      !(index === arr.length - 1 && msg.role === 'assistant')
    );

    setMessages(messagesWithoutLastAI);
    updateChatMessages(currentChatId, messagesWithoutLastAI);

    try {
      const { content: response, sourceDocuments } = await generateResponse(
        lastUserMessage.content, 
        lastUserMessage.files || []
      );

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

    // Optimistic UI Update
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

      // Handle New Conversation Creation
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
      setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Sorry, I encountered an error processing your request. Please try again.",
          type: 'text'
      }]);
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
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], "recording.webm", { type: 'audio/webm' });
          
          const transcription = await groq.audio.transcriptions.create({
            file: audioFile,
            model: "whisper-large-v3",
            temperature: 0,
            response_format: "verbose_json",
          });
          
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

  // Effects
  useEffect(() => {
    setBackendConfig(prev => ({ ...prev, authToken: authToken }));
  }, [authToken]);

// Load chat history EVERY time user logs in (no hasLoadedHistory flag)
useEffect(() => {
  if (authToken) {
    loadChatHistory(authToken);
  } else {
    // User logged out
    setChats([createInitialChat(t, initialChatId)]);
    setCurrentChatId(initialChatId);
    setMessages([]);
    localStorage.removeItem('activeChatId'); // Clear stale active chat
  }
}, [authToken, loadChatHistory, t]);

  useEffect(() => {
    if (previousChatId.current !== currentChatId) {
      setSelectedFiles([]);
      previousChatId.current = currentChatId;
    }
  }, [currentChatId]);

  useEffect(() => {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat && chat.messages !== messages) {
      setMessages(chat.messages);
    }
  }, [currentChatId, chats, messages]);

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
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    getUserInitial,
  };
}
export type UseChatLogicReturn = ReturnType<typeof useChatLogic>;
