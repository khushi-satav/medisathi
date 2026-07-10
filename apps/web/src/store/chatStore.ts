import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { aiService } from '@/services/api';

export interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
  sendMessage: (text: string, context?: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      messages: [
        { role: 'ai', text: 'Hi! I am your MediSaathi assistant. How can I help you with your medications today?' }
      ],
      isLoading: false,
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      clearMessages: () => set({ messages: [
        { role: 'ai', text: 'Hi! I am your MediSaathi assistant. How can I help you with your medications today?' }
      ] }),
      sendMessage: async (text, context) => {
        if (get().isLoading) return;
        set({ isLoading: true });
        
        // Add the visible user message to chat history
        get().addMessage({ role: 'user', text });

        try {
          // Prepend briefing context if available to help the AI answer within daily briefing context
          const query = context 
            ? `Context: "${context}"\nQuestion: ${text}`
            : text;

          const res = await aiService.ask(query);
          get().addMessage({ role: 'ai', text: res.data.answer });
        } catch {
          get().addMessage({ role: 'ai', text: 'Sorry, I am having trouble connecting right now.' });
        } finally {
          set({ isLoading: false });
        }
      }
    }),
    { 
      name: 'medisaathi-chat',
      partialize: (state) => ({ messages: state.messages }) // only persist messages history
    }
  )
);
