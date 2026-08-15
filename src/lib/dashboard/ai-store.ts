// ============================================
// AI Store — Zustand state management for Ask AI
// Conversation history, query state, panel toggle
// ============================================

import { create } from 'zustand';

// =============================================
// Types
// =============================================

export type ContextType =
  | 'stockout_risk'
  | 'forecast_accuracy'
  | 'order_timing'
  | 'seasonal'
  | 'general';

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  contextType?: ContextType;
  dataUsed?: {
    type: ContextType;
    tenant_id?: string;
    context_length?: number;
  };
}

export interface AIQueryResult {
  answer: string;
  query: string;
  context_type: ContextType;
  data_used: {
    type: ContextType;
    tenant_id?: string;
    context_length?: number;
  };
  timestamp: string;
}

// =============================================
// Helpers
// =============================================

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const SESSION_ID_KEY = 'trimedcast-ai-session-id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return `session_${Date.now()}`;
  const existing = sessionStorage.getItem(SESSION_ID_KEY);
  if (existing) return existing;
  const newId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(SESSION_ID_KEY, newId);
  return newId;
}

// =============================================
// Store Interface
// =============================================

interface AIStore {
  // Panel state
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  toggleOpen: () => void;

  // Conversation
  conversations: ConversationMessage[];
  sessionId: string;
  isLoading: boolean;
  error: string | null;

  // Query input
  currentQuery: string;
  setCurrentQuery: (query: string) => void;

  // Rate limit tracking
  lastQueryTime: number | null;
  queryCount: number;

  // Actions
  submitQuery: (query: string) => Promise<void>;
  clearHistory: () => Promise<void>;
  loadHistory: () => Promise<void>;
  reloadConversation: (messageId: string) => void;
}

// Rate limit: max 10 queries per 60 seconds
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;

// =============================================
// Store Implementation
// =============================================

export const useAIStore = create<AIStore>((set, get) => ({
  // Panel state
  isOpen: false,
  setIsOpen: (open) => set({ isOpen: open }),
  toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

  // Conversation
  conversations: [],
  sessionId: '',
  isLoading: false,
  error: null,

  // Query input
  currentQuery: '',
  setCurrentQuery: (query) => set({ currentQuery: query }),

  // Rate limit tracking
  lastQueryTime: null,
  queryCount: 0,

  // Submit query
  submitQuery: async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) {
      set({ error: 'Please enter a question' });
      return;
    }

    // Rate limit check
    const { lastQueryTime, queryCount } = get();
    const now = Date.now();
    if (lastQueryTime && now - lastQueryTime < RATE_LIMIT_WINDOW && queryCount >= RATE_LIMIT_MAX) {
      set({ error: 'Too many requests. Please wait a moment.' });
      return;
    }

    const sessionId = get().sessionId || getOrCreateSessionId();

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: generateId(),
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    set((state) => ({
      conversations: [...state.conversations, userMessage],
      isLoading: true,
      error: null,
      currentQuery: '',
      sessionId,
      queryCount: state.queryCount + 1,
      lastQueryTime: now,
    }));

    // Save user message to conversation API (fire-and-forget)
    fetch('/api/v1/ai/conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        role: 'user',
        content: trimmed,
        tenant_id: 'demo-bd-motors',
      }),
    }).catch(() => {
      // Non-critical: conversation persistence failure should not break the UI
    });

    try {
      const res = await fetch('/api/v1/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: trimmed,
          context_type: 'auto',
          tenant_id: 'demo-bd-motors',
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          set({ error: 'Too many requests. Please wait a moment.', isLoading: false });
          return;
        }
        if (res.status >= 500) {
          set({ error: 'AI is currently unavailable. Please try again.', isLoading: false });
          return;
        }
        const errorData = await res.json().catch(() => null);
        set({
          error: errorData?.error || 'AI is currently unavailable. Please try again.',
          isLoading: false,
        });
        return;
      }

      const json = await res.json();

      if (!json.success) {
        set({
          error: json.error || 'AI is currently unavailable. Please try again.',
          isLoading: false,
        });
        return;
      }

      const data = json.data as AIQueryResult;

      const assistantMessage: ConversationMessage = {
        id: generateId(),
        role: 'assistant',
        content: data.answer,
        timestamp: data.timestamp || new Date().toISOString(),
        contextType: data.context_type,
        dataUsed: data.data_used,
      };

      set((state) => ({
        conversations: [...state.conversations, assistantMessage],
        isLoading: false,
      }));

      // Save assistant message to conversation API (fire-and-forget)
      fetch('/api/v1/ai/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          role: 'assistant',
          content: data.answer,
          context_type: data.context_type,
          metadata: data.data_used,
          tenant_id: 'demo-bd-motors',
        }),
      }).catch(() => {
        // Non-critical
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'AI is currently unavailable. Please try again.',
        isLoading: false,
      });
    }
  },

  // Clear history
  clearHistory: async () => {
    const { sessionId } = get();
    set({ conversations: [], error: null });

    if (sessionId) {
      try {
        await fetch(`/api/v1/ai/conversation?session_id=${sessionId}&clear_all=true`, {
          method: 'DELETE',
        });
      } catch {
        // Non-critical
      }
    }

    // Reset session
    const newSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_ID_KEY, newSessionId);
    }
    set({ sessionId: newSessionId, queryCount: 0, lastQueryTime: null });
  },

  // Load history from API
  loadHistory: async () => {
    const sessionId = get().sessionId || getOrCreateSessionId();
    set({ sessionId });

    try {
      const res = await fetch(`/api/v1/ai/conversation?session_id=${sessionId}&limit=50`);
      const json = await res.json();

      if (json.success && json.data?.messages) {
        const messages: ConversationMessage[] = json.data.messages.map(
          (m: { id: string; role: string; content: string; timestamp: string; metadata?: Record<string, unknown> }) => ({
            id: m.id,
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
            timestamp: m.timestamp,
            contextType: (m.metadata?.type as ContextType) || undefined,
            dataUsed: m.metadata as ConversationMessage['dataUsed'],
          })
        );
        set({ conversations: messages });
      }
    } catch {
      // Non-critical: use local state only
    }
  },

  // Reload a previous conversation (re-submit query)
  reloadConversation: (messageId: string) => {
    const { conversations } = get();
    const message = conversations.find((m) => m.id === messageId);
    if (message && message.role === 'user') {
      set({ currentQuery: message.content });
    }
  },
}));
