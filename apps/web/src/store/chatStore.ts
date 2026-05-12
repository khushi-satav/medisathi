import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  role: 'ai' | 'user';
  text: string;
}

interface ChatState {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: [
        { role: 'ai', text: 'Hi! I am your MediSaathi assistant. How can I help you with your medications today?' }
      ],
      addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),
      clearMessages: () => set({ messages: [
        { role: 'ai', text: 'Hi! I am your MediSaathi assistant. How can I help you with your medications today?' }
      ] }),
    }),
    { name: 'medisaathi-chat' }
  )
);
