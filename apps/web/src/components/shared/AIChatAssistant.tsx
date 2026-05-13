'use client';
import { useState, useRef, useEffect } from 'react';
import { useChatStore } from '@/store/chatStore';
import { aiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Loader2, Bot, Sparkles } from 'lucide-react';

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
    <div className="flex flex-col h-[500px] max-w-md mx-auto bg-card rounded-3xl shadow-elevated border border-border overflow-hidden relative">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-secondary p-5 text-white flex items-center gap-3 shadow-warm z-10 relative">
        <div className="p-2.5 bg-white/20 rounded-full backdrop-blur-md border border-white/20 shadow-inner">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-lg leading-tight text-white">MediSaathi AI</h3>
          <p className="text-white/80 text-xs font-medium">Your personal health companion</p>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-sidebar/30">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
            <Bot size={48} className="text-primary/40" />
            <p className="text-sm text-muted">Hi there! Ask me anything about your medications or schedule.</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-primary to-primary-dark text-white rounded-tr-none shadow-warm' 
                : 'bg-card text-foreground border border-border rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-muted text-xs font-medium">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-card border-t border-border">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2 relative">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Ask about your meds..." 
            className="rounded-full bg-sidebar border-border focus-visible:ring-primary/30 focus-visible:border-primary/50 text-foreground placeholder:text-muted pr-12"
          />
          <Button 
            type="submit" 
            disabled={isLoading || !input.trim()} 
            className="absolute right-1 top-1 rounded-full w-8 h-8 p-0 bg-primary hover:bg-primary-dark text-white shadow-sm flex-shrink-0 transition-transform active:scale-95 disabled:opacity-50"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
