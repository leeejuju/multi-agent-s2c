import {
  del,
  get,
  post,
  postForm,
  requestRunStream,
  requestStream,
  type RequestConfig,
  type ToolStreamEvent,
} from "./index";

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
  parser?: string | null;
  parse_status?: "failed" | "success" | null;
  parse_error?: string | null;
  parsed_text?: string | null;
  parse_metadata?: Record<string, unknown>;
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
  status?: "pending" | "streaming" | "completed" | "failed" | "canceled";
  created_at: string;
}

export interface AgentRunResponse {
  id: string;
  conversation_id: string;
  user_message_id: string;
  assistant_message_id: string;
  agent_id: string;
  status: "queued" | "running" | "canceling" | "completed" | "failed" | "canceled";
  error?: string | null;
  latest_sequence?: number;
  created_at: string;
}

function buildUploadFormData(files: File[]): FormData {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return formData;
}

export const agentApi = {
  getAgents() {
    return get<AgentSummary[]>("/chat/agents");
  },

  uploadAttachmentTmp(
    files: File[],
    config?: Pick<RequestConfig, "signal" | "onUploadProgress">,
  ) {
    return postForm<AttachmentItem[]>(
      "/chat/attachment/tmp/upload",
      buildUploadFormData(files),
      {
        timeout: 180000,
        signal: config?.signal,
        onUploadProgress: config?.onUploadProgress,
      },
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

  createAgentRun(agentId: string, payload: Send2AgentPayload, config: AgentConfig) {
    return post<AgentRunResponse>(`/chat/agent/${agentId}/runs`, {
      ...payload,
      config,
    });
  },

  streamRun(
    runId: string,
    afterSequence: number,
    callbacks: {
      onToken: (token: string) => void;
      onDone: (data: Record<string, unknown>) => void;
      onError: (err: Error) => void;
      onToolEvent?: (event: ToolStreamEvent) => void;
    },
  ) {
    return requestRunStream(
      `/chat/runs/${runId}/stream`,
      { after_sequence: afterSequence },
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

  getActiveRun(conversationId: string) {
    return get<AgentRunResponse | null>(
      `/chat/conversations/${conversationId}/runs/active`,
    );
  },

  cancelRun(runId: string) {
    return post<AgentRunResponse>(`/chat/runs/${runId}/cancel`);
  },

  deleteConversation(conversationId: string) {
    return del(`/chat/conversations/${conversationId}`);
  },
};
