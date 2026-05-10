import { useCallback, useEffect, useRef, useState } from "react";
import { agentApi, type ConversationSummary } from "@/api/agent";

const DEFAULT_AGENT_ID = "DesignAgent";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
};

export function useChat() {
  const streamRef = useRef<{ abort: () => void } | null>(null);

  const [draftText, setDraftText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("gpt-4o");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showConversations, setShowConversations] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const loadConversations = useCallback(async () => {
    try {
      setConversations(await agentApi.getConversations());
    } catch {
      // History is optional
    }
  }, []);

  useEffect(() => {
    void loadConversations();
    return () => streamRef.current?.abort();
  }, [loadConversations]);

  const switchConversation = async (convId: string) => {
    setConversationId(convId);
    setShowConversations(false);
    setMessages([]);

    try {
      const history = await agentApi.getConversationMessages(convId);
      setMessages(
        history.map((message) => ({
          role: message.role === "assistant" ? "assistant" : "user",
          content: message.content,
        })),
      );
    } catch {
      // Handle error
    }
  };

  const newConversation = () => {
    setConversationId(null);
    setMessages([]);
    setShowConversations(false);
  };

  const handleSend = (onScrollToBottom: () => void) => {
    const trimmedText = draftText.trim();
    if ((!trimmedText && attachments.length === 0) || isSending) return;

    setMessages((current) => [
      ...current,
      { role: "user", content: trimmedText },
      { role: "assistant", content: "", streaming: true },
    ]);
    setDraftText("");
    setAttachments([]); // Clear attachments after sending
    onScrollToBottom();
    setIsSending(true);

    streamRef.current = agentApi.send2AgentStream(
      DEFAULT_AGENT_ID,
      { input: trimmedText, conversation_id: conversationId || undefined },
      { model: selectedModelId, stream: true },
      {
        onToken(token) {
          setMessages((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = { ...last, content: `${last.content}${token}` };
            }
            return next;
          });
          onScrollToBottom();
        },
        onDone(data) {
          if (data.conversation_id) setConversationId(data.conversation_id as string);
          if (data.status === "init" || data.type === "metadata") {
            return;
          }
          setMessages((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last?.role === "assistant") next[next.length - 1] = { ...last, streaming: false };
            return next;
          });
          setIsSending(false);
          void loadConversations();
        },
        onError() {
          setIsSending(false);
        },
      }
    );
  };

  const addAttachments = (files: File[]) => {
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  return {
    draftText,
    setDraftText,
    messages,
    setMessages,
    selectedModelId,
    setSelectedModelId,
    conversationId,
    setConversationId,
    isSending,
    conversations,
    showConversations,
    setShowConversations,
    handleSend,
    switchConversation,
    newConversation,
    attachments,
    setAttachments,
    addAttachments,
    removeAttachment,
  };
}
