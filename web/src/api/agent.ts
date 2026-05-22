import { del, get, postForm, requestStream, type ToolStreamEvent } from "./index";

export interface AgentConfig {
  model?: string;
  stream?: boolean;
  enable_think?: boolean;
}

export interface AgentSummary {
  id: string;
  name: string;
  description: string;
}

export interface AttachmentItem {
  id: string;
  file_name: string;
  content_type: string;
  file_size: number;
  object_key: string;
  category: "image" | "document";
  access_url: string;
  thumb_url?: string | null;
}

export interface Send2AgentPayload {
  input: string;
  conversation_id?: string;
  attachments?: AttachmentItem[];
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MessageResponse {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

function buildUploadFormData(files: File[], conversationId?: string): FormData {
  const formData = new FormData();
  if (conversationId) {
    formData.append("conversation_id", conversationId);
  }
  files.forEach((file) => formData.append("files", file));
  return formData;
}

export const agentApi = {
  getAgents() {
    return get<AgentSummary[]>("/chat/agents");
  },

  uploadImages(files: File[], conversationId?: string) {
    return postForm<AttachmentItem[]>(
      "/chat/attachments/images/upload",
      buildUploadFormData(files, conversationId),
    );
  },

  uploadFiles(files: File[], conversationId?: string) {
    return postForm<AttachmentItem[]>(
      "/chat/attachments/files/upload",
      buildUploadFormData(files, conversationId),
    );
  },

  send2AgentStream(
    agentId: string,
    payload: Send2AgentPayload,
    config: AgentConfig,
    callbacks: {
      onToken: (token: string) => void;
      onDone: (data: Record<string, unknown>) => void;
      onError: (err: Error) => void;
      onToolEvent?: (event: ToolStreamEvent) => void;
    },
  ) {
    return requestStream(
      `/chat/agent/${agentId}/run/stream`,
      { ...payload, config },
      callbacks,
    );
  },

  getConversations() {
    return get<ConversationSummary[]>("/chat/conversations");
  },

  getConversationMessages(conversationId: string) {
    return get<MessageResponse[]>(
      `/chat/conversations/${conversationId}/messages`,
    );
  },

  deleteConversation(conversationId: string) {
    return del(`/chat/conversations/${conversationId}`);
  },
};
