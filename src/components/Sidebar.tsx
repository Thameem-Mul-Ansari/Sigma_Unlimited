import React, { useMemo, useState } from 'react';
import { Plus, Search, MessageSquare, Trash2, X, LogOut } from 'lucide-react';
import { UseChatLogicReturn } from '../hooks/useChatLogic';

interface UserData {
  user_id: number;
  username: string;
  email: string;
}

interface SidebarProps {
  logic: UseChatLogicReturn;
  userData?: UserData | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ logic, userData }) => {
  const { 
    sidebarOpen, setSidebarOpen, t, createNewChat, 
    groupedChats, currentChatId, selectChat, deleteChat, 
    handleContextMenu, contextMenu, contextMenuRef,
    isHistoryLoading 
  } = logic;

  // State for logout confirmation popup
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId);
    if (window.innerWidth < 768) { 
      setSidebarOpen(false);
    }
  };

  // Get user initials for avatar
  const getUserInitials = () => {
    if (!userData?.username) return 'U';
    return userData.username.charAt(0).toUpperCase();
  };

  // Get display name
  const getDisplayName = () => {
    if (!userData?.username) return 'User';
    return userData.username;
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/';
  };

  const sortedGroups = useMemo(() => {
    const order = [t.today, t.yesterday, t.lastWeek, t.older];
    const groupEntries = Object.entries(groupedChats);
    const sortedEntries = groupEntries.sort(([keyA], [keyB]) => {
      return order.indexOf(keyA) - order.indexOf(keyB);
    });
    return sortedEntries.map(([timestamp, chatsInGroup]) => {
      const filteredChats = chatsInGroup.filter(chat => !chat.id.startsWith('temp-'));
      const sortedChats = filteredChats.sort((a, b) => parseInt(b.id) - parseInt(a.id));
      return [timestamp, sortedChats];
    }) as [string, UseChatLogicReturn['chats']][];
  }, [groupedChats, t]);

  const newChatButton = logic.chats.find(chat => chat.id.startsWith('temp-'));

  return (
    <>
      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-[60]" 
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => deleteChat(contextMenu.chatId)}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} />
            {t.deleteChat || "Delete Chat"}
          </button>
        </div>
      )}

      {/* Logout Confirmation Popup */}
      {showLogoutPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-auto shadow-2xl">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Confirm Logout</h3>
            <p className="text-gray-600 mb-6">Are you sure you want to logout?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutPopup(false)}
                className="flex-1 py-2.5 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 px-4 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-20 md:hidden" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <div 
        className={`
          fixed top-0 left-0 h-full
          bg-white/95 backdrop-blur-md border-r border-gray-100 
          transition-transform duration-300 ease-in-out 
          flex flex-col shadow-2xl z-30
          ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } 
          md:relative md:translate-x-0 md:w-72 md:shadow-xl md:bg-white md:border-r md:border-gray-200
          w-[65vw] md:w-72
        `}
      >
        
        {/* Header Section */}
        <div className="flex-shrink-0">
          <div className="p-4 flex items-center justify-between border-b border-gray-100 relative"> 
            <div className="flex items-center gap-3">
              <img 
                src="UBTI-Logo.png" 
                alt="Company Logo" 
                className="w-40 h-10 object-contain"
              />
            </div>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close sidebar"
              >
                <X size={20} className="text-gray-600" />
              </button>
            )}
          </div>
          
          {/* New Chat Button */}
          <div className="px-4 py-4">
            <button
              onClick={() => createNewChat()} 
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white transition-all duration-200 shadow-xl shadow-blue-500/30 hover:shadow-blue-500/50 transform hover:scale-[1.005] active:scale-[0.99] font-semibold text-base"
            >
              <Plus size={18} />
              <span>{t.newChat || "New Chat"}</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="px-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder={t.searchConversations || "Search conversations..."}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Chat List Area */}
        <div className="flex-1 overflow-y-auto px-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          
          {/* Display the temporary "New Chat" if it exists */}
          {newChatButton && newChatButton.id === currentChatId && (
            <div className="px-3">
              <div
                key={newChatButton.id}
                className={`
                  relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group mb-1 cursor-pointer
                  bg-blue-50 border border-blue-200 shadow-sm font-medium text-gray-900
                `}
                onClick={() => handleSelectChat(newChatButton.id)}
              >
                <MessageSquare size={16} className="flex-shrink-0 transition-colors text-blue-600" />
                <span className="text-sm truncate flex-1">{newChatButton.title}</span>
              </div>
            </div>
          )}

          {isHistoryLoading ? (
            <div className="text-center text-sm text-gray-500 mt-12 flex flex-col items-center">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3"></div>
              <p className="font-medium text-gray-600">Loading History...</p>
            </div>
          ) : (
            sortedGroups.map(([timestamp, chatsInGroup]) => (
              chatsInGroup.length > 0 && (
                <div key={timestamp} className="mb-4">
                  <div className="text-xs font-bold text-gray-500 px-3 py-2 uppercase tracking-wider select-none">
                    {timestamp}
                  </div>
                  
                  {chatsInGroup.map((chat) => (
                    <div
                      key={chat.id}
                      className={`
                        relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left group mb-1 cursor-pointer
                        ${
                          currentChatId === chat.id
                            ? 'bg-blue-50 border border-blue-200 shadow-sm font-medium text-gray-900'
                            : 'hover:bg-gray-100 text-gray-700'
                        }
                      `}
                      onClick={() => handleSelectChat(chat.id)}
                      onContextMenu={(e) => handleContextMenu(e, chat.id)}
                    >
                      <MessageSquare 
                        size={16} 
                        className={`
                          flex-shrink-0 transition-colors
                          ${currentChatId === chat.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600'}
                        `} 
                      />
                      <span className="text-sm truncate flex-1">{chat.title}</span>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        className={`
                          p-1 rounded-full transition-all duration-200
                          ${currentChatId === chat.id ? 'opacity-100 hover:bg-blue-100' : 'opacity-0 group-hover:opacity-100 hover:bg-red-50'}
                        `}
                        title={t.deleteChat || "Delete Chat"}
                        aria-label={`Delete chat: ${chat.title}`}
                      >
                        <Trash2 size={14} className={`
                          transition-colors
                          ${currentChatId === chat.id ? 'text-blue-400 hover:text-red-500' : 'text-gray-400 hover:text-red-500'}
                        `} />
                      </button>
                    </div>
                  ))}
                </div>
              )
            ))
          )} 
        </div>

        {/* Fixed Sidebar Footer (User/Settings) - UPDATED */}
        <div className="flex-shrink-0 p-4 border-t border-gray-100 space-y-2">
          <button
            onClick={() => setShowLogoutPopup(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-100 transition-colors group"
            aria-label="Logout"
          >
            {/* Avatar/Initials - UPDATED to use user data */}
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md shadow-teal-500/30">
              {getUserInitials()}
            </div>
            <div className="flex-1 text-left">
              <div className="text-sm font-semibold text-gray-800">
                {getDisplayName()}
              </div>
              {/* <div className="text-xs text-gray-500 truncate">
                {userData?.email || ''}
              </div> */}
            </div>
            <LogOut size={18} className="text-gray-400 group-hover:text-red-500 transition-colors" />
          </button>
        </div>
      </div>
    </>
  );
}