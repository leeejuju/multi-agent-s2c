import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { ToolStreamEvent } from "@/api/index";

const DEFAULT_AGENT_ID = "DesignAgent";

type StateUpdater<T> = T | ((current: T) => T);

export type ChatMessageAttachment = {
  id: string;
  file_name: string;
  content_type: string;
  file_size?: number | null;
  object_key?: string | null;
  category?: "image" | "document" | null;
  access_url?: string;
  thumb_url?: string | null;
  parser?: string | null;
  parse_status?: "failed" | "success" | null;
  parse_error?: string | null;
  uploading?: boolean;
  error?: string;
};

export type ChatMessage = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  status?: "pending" | "streaming" | "completed" | "failed" | "canceled";
  runId?: string;
  attachments?: ChatMessageAttachment[];
  streaming?: boolean;
  toolActivities?: ToolActivity[];
};

export type ToolActivity = {
  id: string;
  name: string;
  resultCount?: number;
  resultItems?: string[];
  searchScope?: string | string[];
  source?: string;
  status: ToolStreamEvent["status"];
  title?: string;
  query?: string;
};

interface ChatState {
  draftText: string;
  messages: ChatMessage[];
  selectedModelId: string;
  selectedAgentId: string;
  conversationId: string | null;
  setDraftText: (value: string) => void;
  setMessages: (value: StateUpdater<ChatMessage[]>) => void;
  setSelectedModelId: (value: string) => void;
  setSelectedAgentId: (value: string) => void;
  setConversationId: (value: string | null) => void;
}

function resolveState<T>(current: T, value: StateUpdater<T>) {
  return typeof value === "function" ? (value as (current: T) => T)(current) : value;
}

function sanitizeMessagesForStorage(messages: ChatMessage[]) {
  return messages.map((message) => ({
    ...message,
    streaming: false,
    attachments: message.attachments?.map((attachment) =>
      attachment.uploading
        ? {
            ...attachment,
            uploading: false,
            error: attachment.error || "Interrupted",
          }
        : attachment,
    ),
  }));
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      draftText: "",
      messages: [],
      selectedModelId: "gpt-4o",
      selectedAgentId: DEFAULT_AGENT_ID,
      conversationId: null,
      setDraftText: (draftText) => set({ draftText }),
      setMessages: (value) =>
        set((state) => ({
          messages: resolveState(state.messages, value),
        })),
      setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
      setSelectedAgentId: (selectedAgentId) => set({ selectedAgentId }),
      setConversationId: (conversationId) => set({ conversationId }),
    }),
    {
      name: "chat-ui-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        conversationId: state.conversationId,
        draftText: state.draftText,
        messages: sanitizeMessagesForStorage(state.messages),
        selectedAgentId: state.selectedAgentId,
        selectedModelId: state.selectedModelId,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ChatState>;
        return {
          ...currentState,
          ...persisted,
          messages: sanitizeMessagesForStorage(persisted.messages || []),
        };
      },
    },
  ),
);
