'use client';

import { useState } from 'react';
import { Search, Plus, Send, MessageSquare, MoreVertical, Phone, Video } from 'lucide-react';

const MOCK_CONTACTS = [
  { id: 1, name: 'Dr. Sharma', role: 'Doctor', lastMessage: 'Your blood sugar levels look good!', time: '10:42 AM', unread: 2, online: true, avatar: 'DS' },
  { id: 2, name: 'Sarah (Caregiver)', role: 'Family', lastMessage: 'Did you take your evening medicines?', time: 'Yesterday', unread: 0, online: false, avatar: 'SC' },
];

const MOCK_MESSAGES = {
  1: [
    { id: 101, text: 'Hello! I saw your recent logs.', sender: 'them', time: '10:40 AM' },
    { id: 102, text: 'Your blood sugar levels look good!', sender: 'them', time: '10:42 AM' },
  ],
  2: [
    { id: 201, text: 'Hey mom, just checking in.', sender: 'them', time: 'Yesterday, 8:00 PM' },
    { id: 202, text: 'Did you take your evening medicines?', sender: 'them', time: 'Yesterday, 8:05 PM' },
    { id: 203, text: 'Yes, just took them! Thanks.', sender: 'me', time: 'Yesterday, 8:10 PM' },
  ]
};

export default function MessagesPage() {
  const [activeContact, setActiveContact] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState('');

  const activeChat = activeContact ? MOCK_CONTACTS.find(c => c.id === activeContact) : null;
  const messages = activeContact ? MOCK_MESSAGES[activeContact as keyof typeof MOCK_MESSAGES] : [];

  return (
    <div className="h-[calc(100vh-2rem)] flex gap-4">
      {/* Left Panel: Contacts */}
      <div className="w-80 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Messages</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search conversations..." 
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {MOCK_CONTACTS.map((contact) => (
            <div 
              key={contact.id}
              onClick={() => setActiveContact(contact.id)}
              className={`p-4 border-b border-slate-50 cursor-pointer transition-colors flex items-center gap-3 hover:bg-slate-50 ${activeContact === contact.id ? 'bg-primary/5' : ''}`}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                  {contact.avatar}
                </div>
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="font-semibold text-slate-800 truncate">{contact.name}</h3>
                  <span className="text-xs text-slate-400">{contact.time}</span>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-sm text-slate-500 truncate">{contact.lastMessage}</p>
                  {contact.unread > 0 && (
                    <span className="w-5 h-5 bg-primary text-white text-xs rounded-full flex items-center justify-center font-medium ml-2 shrink-0">
                      {contact.unread}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-100">
          <button className="w-full py-2.5 bg-primary/5 text-primary rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary/10 transition-colors">
            <Plus size={18} /> New Message
          </button>
        </div>
      </div>

      {/* Right Panel: Chat Area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col overflow-hidden">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                  {activeChat.avatar}
                </div>
                <div>
                  <h2 className="font-bold text-slate-800 leading-tight">{activeChat.name}</h2>
                  <p className="text-xs text-emerald-500 font-medium">{activeChat.online ? 'Online' : 'Offline'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <button className="p-2 hover:bg-slate-50 rounded-full transition-colors"><Phone size={20} /></button>
                <button className="p-2 hover:bg-slate-50 rounded-full transition-colors"><Video size={20} /></button>
                <button className="p-2 hover:bg-slate-50 rounded-full transition-colors"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 flex flex-col gap-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${
                    msg.sender === 'me' 
                      ? 'bg-primary text-white rounded-tr-sm' 
                      : 'bg-white text-slate-800 border border-slate-100 shadow-sm rounded-tl-sm'
                  }`}>
                    <p className="text-[15px]">{msg.text}</p>
                    <p className={`text-[10px] mt-1 text-right ${msg.sender === 'me' ? 'text-white/80' : 'text-slate-400'}`}>
                      {msg.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..." 
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newMessage.trim()) {
                      setNewMessage('');
                    }
                  }}
                />
                <button 
                  className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors shrink-0 shadow-md shadow-primary/30"
                  disabled={!newMessage.trim()}
                >
                  <Send size={18} className="ml-1" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <MessageSquare size={48} className="text-slate-300" />
            </div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">Your Messages</h3>
            <p className="max-w-xs text-center">Select a conversation from the left to start messaging, or create a new message.</p>
          </div>
        )}
      </div>
    </div>
  );
}
