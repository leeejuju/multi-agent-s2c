import { useCallback, useEffect, useRef, useState } from "react";
import { agentApi, type AgentSummary, type ConversationSummary } from "@/api/agent";
import type { ToolStreamEvent } from "@/api/index";

const DEFAULT_AGENT_ID = "DesignAgent";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
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

export function useChat() {
  const streamRef = useRef<{ abort: () => void } | null>(null);
  const tokenBufferRef = useRef("");
  const tokenFrameRef = useRef<number | null>(null);
  const scrollToBottomRef = useRef<(() => void) | null>(null);

  const [draftText, setDraftText] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedModelId, setSelectedModelId] = useState("gpt-4o");
  const [selectedAgentId, setSelectedAgentId] = useState(DEFAULT_AGENT_ID);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
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

  const flushTokenBuffer = useCallback(() => {
    const tokenBuffer = tokenBufferRef.current;
    if (!tokenBuffer) return;

    tokenBufferRef.current = "";
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (last?.role === "assistant") {
        next[next.length - 1] = { ...last, content: `${last.content}${tokenBuffer}` };
      }
      return next;
    });
    scrollToBottomRef.current?.();
  }, []);

  const scheduleTokenFlush = useCallback(() => {
    if (tokenFrameRef.current !== null) return;

    tokenFrameRef.current = window.requestAnimationFrame(() => {
      tokenFrameRef.current = null;
      flushTokenBuffer();
    });
  }, [flushTokenBuffer]);

  useEffect(() => {
    void loadConversations();
    void agentApi.getAgents().then(setAgents).catch(() => {
      setAgents([
        {
          id: DEFAULT_AGENT_ID,
          name: "design_agent",
          description: "Default creative planning agent",
        },
      ]);
    });
    return () => {
      streamRef.current?.abort();
      if (tokenFrameRef.current !== null) {
        window.cancelAnimationFrame(tokenFrameRef.current);
        tokenFrameRef.current = null;
      }
    };
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
    scrollToBottomRef.current = onScrollToBottom;
    tokenBufferRef.current = "";
    if (tokenFrameRef.current !== null) {
      window.cancelAnimationFrame(tokenFrameRef.current);
      tokenFrameRef.current = null;
    }
    setIsSending(true);

    streamRef.current = agentApi.send2AgentStream(
      selectedAgentId,
      { input: trimmedText, conversation_id: conversationId || undefined },
      { model: selectedModelId, stream: true },
      {
        onToken(token) {
          tokenBufferRef.current += token;
          scheduleTokenFlush();
        },
        onToolEvent(event) {
          flushTokenBuffer();
          setMessages((current) => {
            const next = [...current];
            let last = next[next.length - 1];
            if (last?.role !== "assistant") {
              last = {
                role: "assistant",
                content: "",
                streaming: true,
                toolActivities: [],
              };
              next.push(last);
            }

            const activities = [...(last.toolActivities ?? [])];
            const index = activities.findIndex(
              (activity) => activity.id === event.tool_call_id,
            );
            const existing = index >= 0 ? activities[index] : undefined;
            const resultItems = event.result_items ?? existing?.resultItems;
            const searchScope =
              event.search_scopes ??
              event.search_scope ??
              event.source ??
              existing?.searchScope;

            const activity: ToolActivity = {
              id: event.tool_call_id,
              name: event.tool_name,
              query: event.query ?? existing?.query,
              resultCount:
                event.result_count ?? resultItems?.length ?? existing?.resultCount,
              resultItems,
              searchScope,
              source: event.source ?? existing?.source,
              status: event.status,
              title: event.title ?? existing?.title,
            };

            if (index >= 0) {
              activities[index] = activity;
            } else {
              activities.push(activity);
            }
            next[next.length - 1] = { ...last, toolActivities: activities };
            return next;
          });
          onScrollToBottom();
        },
        onDone(data) {
          if (data.conversation_id) setConversationId(data.conversation_id as string);
          if (data.status === "init" || data.type === "metadata") {
            return;
          }
          flushTokenBuffer();
          setMessages((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last?.role === "assistant") next[next.length - 1] = { ...last, streaming: false };
            return next;
          });
          setIsSending(false);
          streamRef.current = null;
          scrollToBottomRef.current = null;
          void loadConversations();
        },
        onError() {
          flushTokenBuffer();
          setIsSending(false);
          streamRef.current = null;
          scrollToBottomRef.current = null;
        },
      }
    );
  };

  const stopSending = () => {
    streamRef.current?.abort();
    streamRef.current = null;
    if (tokenFrameRef.current !== null) {
      window.cancelAnimationFrame(tokenFrameRef.current);
      tokenFrameRef.current = null;
    }
    flushTokenBuffer();
    setIsSending(false);
    scrollToBottomRef.current = null;
    setMessages((current) => {
      const next = [...current];
      const last = next[next.length - 1];
      if (last?.role === "assistant") {
        next[next.length - 1] = { ...last, streaming: false };
      }
      return next;
    });
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
    selectedAgentId,
    setSelectedAgentId,
    agents,
    conversationId,
    setConversationId,
    isSending,
    conversations,
    showConversations,
    setShowConversations,
    handleSend,
    stopSending,
    switchConversation,
    newConversation,
    attachments,
    setAttachments,
    addAttachments,
    removeAttachment,
  };
}
