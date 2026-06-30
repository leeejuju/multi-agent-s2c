import { useCallback, useEffect, useRef, useState } from "react";
import {
  agentApi,
  type AgentRunResponse,
  type AgentSummary,
  type AttachmentItem,
  type ConversationSummary,
} from "@/api/agent";
import {
  useChatStore,
  type ChatMessage,
  type ChatMessageAttachment,
  type ToolActivity,
} from "@/store/chat";

const DEFAULT_AGENT_ID = "DesignAgent";
const IMAGE_EXTENSIONS = new Set(["bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"]);

export type { ChatMessage, ChatMessageAttachment, ToolActivity } from "@/store/chat";

type ScrollToBottom = (options?: { force?: boolean }) => void;

type UploadAttachment = ChatMessageAttachment & {
  file: File;
  uploaded?: AttachmentItem;
};

type UploadTask = {
  promise: Promise<AttachmentItem>;
  abortController: AbortController;
};

function getFileExtension(file: File) {
  return file.name.split(".").pop()?.toLowerCase() || "";
}

function getFileCategory(file: File): "image" | "document" {
  if (file.type.startsWith("image/") || IMAGE_EXTENSIONS.has(getFileExtension(file))) {
    return "image";
  }
  return "document";
}

function isUploadFinished(attachment: UploadAttachment): boolean {
  return attachment.uploaded !== undefined;
}

function createPendingAttachment(file: File, index: number): UploadAttachment {
  const localId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${index}`;
  return {
    id: `pending-${localId}`,
    file,
    file_name: file.name,
    content_type: file.type || "application/octet-stream",
    file_size: file.size,
    category: getFileCategory(file),
    uploading: true,
    uploadProgress: 0,
  };
}

function normalizeAttachment(value: unknown): ChatMessageAttachment | null {
  if (!value || typeof value !== "object") return null;
  const attachment = value as Record<string, unknown>;
  if (
    typeof attachment.file_name !== "string" ||
    typeof attachment.content_type !== "string"
  ) {
    return null;
  }

  const category =
    attachment.category === "image" || attachment.category === "document"
      ? attachment.category
      : null;

  return {
    id: typeof attachment.id === "string" ? attachment.id : attachment.file_name,
    file_name: attachment.file_name,
    content_type: attachment.content_type,
    file_size:
      typeof attachment.file_size === "number" ? attachment.file_size : null,
    file_key:
      typeof attachment.file_key === "string" ? attachment.file_key : null,
    category,
    access_url:
      typeof attachment.access_url === "string" ? attachment.access_url : undefined,
    thumb_url:
      typeof attachment.thumb_url === "string" ? attachment.thumb_url : null,
    parser: typeof attachment.parser === "string" ? attachment.parser : null,
    parse_status:
      attachment.parse_status === "failed" || attachment.parse_status === "success"
        ? attachment.parse_status
        : null,
    parse_error:
      typeof attachment.parse_error === "string" ? attachment.parse_error : null,
    uploading: false,
    uploadProgress: undefined,
  };
}

function getInitAttachments(data: Record<string, unknown>): ChatMessageAttachment[] {
  const msg = data.msg;
  if (!msg || typeof msg !== "object") return [];
  const message = msg as Record<string, unknown>;
  if (message.role !== "user" && message.type !== "human") return [];
  const rawAttachments = message.attachments;
  if (!Array.isArray(rawAttachments)) return [];
  return rawAttachments
    .map(normalizeAttachment)
    .filter((attachment): attachment is ChatMessageAttachment => Boolean(attachment));
}

function applyAttachmentsToLastUserMessage(
  current: ChatMessage[],
  attachments: ChatMessageAttachment[],
) {
  if (attachments.length === 0) return current;

  const next = [...current];
  for (let index = next.length - 1; index >= 0; index -= 1) {
    if (next[index].role === "user") {
      next[index] = { ...next[index], attachments };
      break;
    }
  }
  return next;
}

function updateLastUserAttachment(
  current: ChatMessage[],
  attachmentId: string,
  updates: Partial<ChatMessageAttachment>,
) {
  const next = [...current];
  for (let index = next.length - 1; index >= 0; index -= 1) {
    const message = next[index];
    if (message.role !== "user" || !message.attachments?.length) {
      continue;
    }

    next[index] = {
      ...message,
      attachments: message.attachments.map((attachment) =>
        attachment.id === attachmentId ? { ...attachment, ...updates } : attachment,
      ),
    };
    break;
  }
  return next;
}

function toMessageAttachment(attachment: UploadAttachment): ChatMessageAttachment {
  const { file: _file, uploaded: _uploaded, ...messageAttachment } = attachment;
  return messageAttachment;
}

function mapHistoryMessage(message: {
  id: string;
  role: string;
  content: string;
  status?: ChatMessage["status"];
}): ChatMessage {
  const status = message.status || "completed";
  return {
    id: message.id,
    role: message.role === "assistant" ? "assistant" : "user",
    content: message.content,
    status,
    streaming: status === "streaming" || status === "pending",
  };
}

async function uploadAttachment(
  file: File,
  signal?: AbortSignal,
  onProgress?: (progress: number) => void,
): Promise<AttachmentItem> {
  onProgress?.(0);
  const items = await agentApi.uploadAttachmentTmp([file], {
    signal,
    onUploadProgress: ({ percent }) => onProgress?.(percent),
  });
  const item = items[0];
  if (!item) {
    throw new Error(`Attachment upload returned no item: ${file.name}`);
  }
  onProgress?.(100);
  return item;
}

export function useChat() {
  const streamRef = useRef<{ abort: () => void } | null>(null);
  const uploadTasksRef = useRef<Map<string, UploadTask>>(new Map());
  const activeRunRef = useRef<AgentRunResponse | null>(null);
  const lastSequenceRef = useRef(0);
  const tokenBufferRef = useRef("");
  const tokenFrameRef = useRef<number | null>(null);
  const scrollToBottomRef = useRef<ScrollToBottom | null>(null);

  const draftText = useChatStore((state) => state.draftText);
  const setDraftText = useChatStore((state) => state.setDraftText);
  const messages = useChatStore((state) => state.messages);
  const setMessagePersistencePaused = useChatStore(
    (state) => state.setMessagePersistencePaused,
  );
  const setMessages = useChatStore((state) => state.setMessages);
  const selectedModelId = useChatStore((state) => state.selectedModelId);
  const setSelectedModelId = useChatStore((state) => state.setSelectedModelId);
  const selectedAgentId = useChatStore((state) => state.selectedAgentId);
  const setSelectedAgentId = useChatStore((state) => state.setSelectedAgentId);
  const conversationId = useChatStore((state) => state.conversationId);
  const setConversationId = useChatStore((state) => state.setConversationId);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [showConversations, setShowConversations] = useState(false);
  const [attachments, setAttachments] = useState<UploadAttachment[]>([]);

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
  }, [setMessages]);

  const scheduleTokenFlush = useCallback(() => {
    if (tokenFrameRef.current !== null) return;

    tokenFrameRef.current = window.requestAnimationFrame(() => {
      tokenFrameRef.current = null;
      flushTokenBuffer();
    });
  }, [flushTokenBuffer]);

  const applyToolEvent = useCallback((event: ToolActivity & { type?: "tool" }) => {
    setMessages((current) => {
      const next = [...current];
      let last = next[next.length - 1];
      if (last?.role !== "assistant") {
        last = {
          role: "assistant",
          content: "",
          streaming: true,
          status: "streaming",
          toolActivities: [],
        };
        next.push(last);
      }

      const activities = [...(last.toolActivities ?? [])];
      const index = activities.findIndex((activity) => activity.id === event.id);
      const existing = index >= 0 ? activities[index] : undefined;
      const activity: ToolActivity = {
        id: event.id,
        name: event.name,
        query: event.query ?? existing?.query,
        resultCount:
          event.resultCount ?? event.resultItems?.length ?? existing?.resultCount,
        resultItems: event.resultItems ?? existing?.resultItems,
        searchScope: event.searchScope ?? existing?.searchScope,
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
  }, [setMessages]);

  const updateAttachmentUploadState = useCallback(
    (attachmentId: string, updates: Partial<ChatMessageAttachment>) => {
      setAttachments((current) =>
        current.map((attachment) =>
          attachment.id === attachmentId ? { ...attachment, ...updates } : attachment,
        ),
      );
      setMessages((current) =>
        updateLastUserAttachment(current, attachmentId, updates),
      );
    },
    [setMessages],
  );

  const subscribeToRun = useCallback(
    (run: AgentRunResponse, afterSequence = 0, onScrollToBottom?: ScrollToBottom) => {
      streamRef.current?.abort();
      setMessagePersistencePaused(true);
      activeRunRef.current = run;
      lastSequenceRef.current = afterSequence;
      setIsSending(run.status === "queued" || run.status === "running");

      streamRef.current = agentApi.streamRun(run.id, afterSequence, {
        onToken(token) {
          tokenBufferRef.current += token;
          scheduleTokenFlush();
        },
        onToolEvent(event) {
          flushTokenBuffer();
          applyToolEvent({
            id: event.tool_call_id,
            name: event.tool_name,
            query: event.query,
            resultCount:
              event.result_count ?? event.result_items?.length,
            resultItems: event.result_items,
            searchScope:
              event.search_scopes ??
              event.search_scope ??
              event.source,
            source: event.source,
            status: event.status,
            title: event.title,
          });
          onScrollToBottom?.();
        },
        onDone(data) {
          if (typeof data.sequence === "number") {
            lastSequenceRef.current = data.sequence;
          }
          if (data.conversation_id) setConversationId(data.conversation_id as string);
          if (data.status === "init" || data.type === "metadata") {
            const initAttachments = getInitAttachments(data);
            if (initAttachments.length > 0) {
              setMessages((current) =>
                applyAttachmentsToLastUserMessage(current, initAttachments),
              );
              onScrollToBottom?.();
            }
            return;
          }
          flushTokenBuffer();
          setMessages((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                streaming: false,
                status: data.status === "canceled" ? "canceled" : "completed",
              };
            }
            return next;
          });
          setMessagePersistencePaused(false);
          setIsSending(false);
          streamRef.current = null;
          activeRunRef.current = null;
          scrollToBottomRef.current = null;
          void loadConversations();
        },
        onError(error) {
          flushTokenBuffer();
          setMessages((current) => {
            const next = [...current];
            const last = next[next.length - 1];
            if (last?.role === "assistant") {
              next[next.length - 1] = {
                ...last,
                content: last.content || error.message,
                status: "failed",
                streaming: false,
              };
            }
            return next;
          });
          setMessagePersistencePaused(false);
          setIsSending(false);
          streamRef.current = null;
          activeRunRef.current = null;
          scrollToBottomRef.current = null;
        },
      });
    },
    [
      applyToolEvent,
      flushTokenBuffer,
      loadConversations,
      scheduleTokenFlush,
      setConversationId,
      setMessagePersistencePaused,
      setMessages,
    ],
  );

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
      uploadTasksRef.current.forEach((task) => task.abortController.abort());
      uploadTasksRef.current.clear();
      streamRef.current?.abort();
      if (tokenFrameRef.current !== null) {
        window.cancelAnimationFrame(tokenFrameRef.current);
        tokenFrameRef.current = null;
      }
      setMessagePersistencePaused(false);
    };
  }, [loadConversations, setMessagePersistencePaused]);

  const switchConversation = async (convId: string) => {
    streamRef.current?.abort();
    streamRef.current = null;
    activeRunRef.current = null;
    uploadTasksRef.current.forEach((task) => task.abortController.abort());
    uploadTasksRef.current.clear();
    setAttachments([]);
    setIsSending(false);
    setConversationId(convId);
    setShowConversations(false);
    setMessages([]);
    setMessagePersistencePaused(false);

    try {
      const history = await agentApi.getConversationMessages(convId);
      setMessages(history.map(mapHistoryMessage));
      const activeRun = await agentApi.getActiveRun(convId);
      if (activeRun) {
        setMessages((current) => {
          const next = [...current];
          for (let index = next.length - 1; index >= 0; index -= 1) {
            if (next[index].id === activeRun.assistant_message_id) {
              next[index] = {
                ...next[index],
                runId: activeRun.id,
                streaming: true,
                status: "streaming",
              };
              break;
            }
          }
          return next;
        });
        subscribeToRun(activeRun, activeRun.latest_sequence ?? 0);
      }
    } catch {
      // Handle error
    }
  };

  const newConversation = () => {
    streamRef.current?.abort();
    streamRef.current = null;
    activeRunRef.current = null;
    uploadTasksRef.current.forEach((task) => task.abortController.abort());
    uploadTasksRef.current.clear();
    setAttachments([]);
    setIsSending(false);
    setConversationId(null);
    setMessages([]);
    setShowConversations(false);
    setMessagePersistencePaused(false);
  };

  useEffect(() => {
    if (!conversationId) return;
    void switchConversation(conversationId);
    // Run once on mount to replace persisted UI state with authoritative backend state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSend = async (onScrollToBottom: ScrollToBottom) => {
    const trimmedText = draftText.trim();
    const pendingAttachments = attachments.filter((attachment) => attachment.file);
    if ((!trimmedText && pendingAttachments.length === 0) || isSending) return;
    const allUploadsFinished = pendingAttachments.every(isUploadFinished);
    if (!allUploadsFinished) {
      return;
    }

    const selectedAttachments = [...attachments];
    const selectedAttachmentIds = new Set(
      selectedAttachments.map((attachment) => attachment.id),
    );
    const messageAttachments = selectedAttachments.map(toMessageAttachment);

    setMessagePersistencePaused(true);
    setMessages((current) => [
      ...current,
      {
        role: "user",
        content: trimmedText,
        attachments: messageAttachments,
        status: allUploadsFinished ? "completed" : "pending",
      },
    ]);
    setDraftText("");
    setAttachments((current) =>
      current.filter((attachment) => !selectedAttachmentIds.has(attachment.id)),
    );
    onScrollToBottom({ force: true });
    scrollToBottomRef.current = onScrollToBottom;
    tokenBufferRef.current = "";
    if (tokenFrameRef.current !== null) {
      window.cancelAnimationFrame(tokenFrameRef.current);
      tokenFrameRef.current = null;
    }
    setIsSending(true);

    let uploadedAttachments: AttachmentItem[] = [];
    try {
      uploadedAttachments = await Promise.all(
        selectedAttachments.map((attachment) => {
          if (attachment.uploaded) {
            return Promise.resolve(attachment.uploaded);
          }
          const task = uploadTasksRef.current.get(attachment.id);
          if (!task) {
            return Promise.reject(
              new Error(`Attachment upload is not available: ${attachment.file_name}`),
            );
          }
          return task.promise;
        }),
      );
      const uploadedMessageAttachments = uploadedAttachments
        .map(normalizeAttachment)
        .filter((attachment): attachment is ChatMessageAttachment => Boolean(attachment));
      setMessages((current) =>
        applyAttachmentsToLastUserMessage(current, uploadedMessageAttachments),
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Attachment upload failed";
      if (errorMessage === "Request aborted") {
        setMessagePersistencePaused(false);
        setIsSending(false);
        streamRef.current = null;
        scrollToBottomRef.current = null;
        return;
      }
      setMessages((current) => {
        const next = applyAttachmentsToLastUserMessage(
          current,
          messageAttachments.map((attachment) => ({
            ...attachment,
            uploading: false,
            uploadProgress: undefined,
            error: errorMessage,
          })),
        );
        return [
          ...next,
          {
            role: "assistant",
            content: `Attachment upload failed: ${errorMessage}`,
            status: "failed",
            streaming: false,
          },
        ];
      });
      setMessagePersistencePaused(false);
      setIsSending(false);
      streamRef.current = null;
      scrollToBottomRef.current = null;
      return;
    }

    try {
      const run = await agentApi.createAgentRun(
        selectedAgentId,
        {
          input: trimmedText,
          conversation_id: conversationId || undefined,
          attachments: uploadedAttachments,
        },
        { model: selectedModelId, stream: true },
      );
      setConversationId(run.conversation_id);
      setMessages((current) => {
        const next = [...current];
        let userIndex = -1;
        for (let index = next.length - 1; index >= 0; index -= 1) {
          if (next[index].role === "user") {
            userIndex = index;
            break;
          }
        }
        if (userIndex >= 0) {
          next[userIndex] = {
            ...next[userIndex],
            id: run.user_message_id,
            status: "completed",
          };
          next.splice(userIndex + 1, 0, {
            id: run.assistant_message_id,
            role: "assistant",
            content: "",
            runId: run.id,
            status: "streaming",
            streaming: true,
          });
        }
        return next;
      });
      subscribeToRun(run, 0, onScrollToBottom);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Request failed";
      flushTokenBuffer();
      setMessages((current) => {
        return [
          ...current,
          {
            role: "assistant",
            content: errorMessage,
            status: "failed",
            streaming: false,
          },
        ];
      });
      setIsSending(false);
      streamRef.current = null;
      scrollToBottomRef.current = null;
      setMessagePersistencePaused(false);
    }
  };

  const stopSending = () => {
    const run = activeRunRef.current;
    if (run) {
      void agentApi.cancelRun(run.id).catch(() => {
        // The local stream is still stopped even if the backend cancel request fails.
      });
    }
    uploadTasksRef.current.forEach((task) => task.abortController.abort());
    uploadTasksRef.current.clear();
    streamRef.current?.abort();
    streamRef.current = null;
    activeRunRef.current = null;
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
        next[next.length - 1] = { ...last, streaming: false, status: "canceled" };
      }
      for (let index = next.length - 1; index >= 0; index -= 1) {
        const message = next[index];
        if (message.role !== "user" || !message.attachments?.length) {
          continue;
        }
        next[index] = {
          ...message,
          attachments: message.attachments.map((attachment) =>
            attachment.uploading
              ? {
                  ...attachment,
                  uploading: false,
                  uploadProgress: undefined,
                  error: "Canceled",
                }
              : attachment,
          ),
        };
        break;
      }
      return next;
    });
    setMessagePersistencePaused(false);
  };

  const addAttachments = (files: File[]) => {
    const pendingAttachments = files.map(createPendingAttachment);
    setAttachments((prev) => [...prev, ...pendingAttachments]);

    pendingAttachments.forEach((attachment) => {
      const abortController = new AbortController();
      const promise = uploadAttachment(
        attachment.file,
        abortController.signal,
        (progress) => {
          updateAttachmentUploadState(attachment.id, {
            uploading: true,
            uploadProgress: progress,
            error: undefined,
          });
        },
      )
        .then((item) => {
          const uploadedAttachment = normalizeAttachment(item);
          const updates: Partial<ChatMessageAttachment> = {
            ...(uploadedAttachment ? { ...uploadedAttachment, id: attachment.id } : {}),
            uploading: false,
            uploadProgress: 100,
            error: undefined,
          };
          setAttachments((current) =>
            current.map((currentAttachment) =>
              currentAttachment.id === attachment.id
                ? {
                    ...currentAttachment,
                    ...(uploadedAttachment || {}),
                    id: currentAttachment.id,
                    uploaded: item,
                    uploading: false,
                    uploadProgress: 100,
                    error: undefined,
                  }
                : currentAttachment,
            ),
          );
          setMessages((current) =>
            updateLastUserAttachment(current, attachment.id, updates),
          );
          return item;
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            const errorMessage =
              error instanceof Error ? error.message : "Attachment upload failed";
            updateAttachmentUploadState(attachment.id, {
              uploading: false,
              uploadProgress: undefined,
              error: errorMessage,
            });
          }
          throw error;
        })
        .finally(() => {
          uploadTasksRef.current.delete(attachment.id);
        });

      uploadTasksRef.current.set(attachment.id, {
        promise,
        abortController,
      });
      void promise.catch(() => {
        // The send path awaits this same promise when the attachment is used.
      });
    });
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const attachment = prev[index];
      if (attachment) {
        const task = uploadTasksRef.current.get(attachment.id);
        task?.abortController.abort();
        uploadTasksRef.current.delete(attachment.id);
      }
      return prev.filter((_, i) => i !== index);
    });
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
