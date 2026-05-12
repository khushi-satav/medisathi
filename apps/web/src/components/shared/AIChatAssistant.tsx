'use client';
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { aiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2, Bot, User } from 'lucide-react';

export default function AIChatAssistant() {
  const { messages, addMessage } = useChatStore();
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setInput('');
    addMessage({ role: 'user', text: userMsg });
    setIsLoading(true);

    try {
      const res = await aiService.ask(userMsg);
      addMessage({ role: 'ai', text: res.data.answer });
    } catch (error) {
      addMessage({ role: 'ai', text: 'Sorry, I am having trouble connecting right now.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[500px] max-w-md mx-auto bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-100 dark:border-zinc-800 overflow-hidden relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center gap-3 shadow-md z-10 relative">
        <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight">MediSaathi AI</h3>
          <p className="text-blue-100 text-xs">Always here to help</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-50 dark:bg-zinc-950/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm text-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-100 dark:border-zinc-700 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="text-zinc-500 text-xs">Typing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Ask about your meds..." 
            className="rounded-full bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 focus-visible:ring-blue-500"
          />
          <Button type="submit" disabled={isLoading} className="rounded-full w-10 h-10 p-0 bg-blue-600 hover:bg-blue-700 text-white shadow-md flex-shrink-0">
            <Send className="w-4 h-4 ml-1" />
          </Button>
        </form>
      </div>
    </div>
  );
}
