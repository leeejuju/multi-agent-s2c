import { del, get, postForm, requestStream } from "./index";

export interface AgentConfig {
  model?: string;
  stream?: boolean;
  enable_think?: boolean;
}

/**
 * 附件条目信息
 */
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

/**
 * 发送给智能体的请求负载
 */
export interface Send2AgentPayload {
  input: string;
  conversation_id?: string;
  attachments?: AttachmentItem[];
}

/**
 * 构建上传文件的 FormData
 */
function buildUploadFormData(files: File[], conversationId?: string): FormData {
  const formData = new FormData();
  if (conversationId) {
    formData.append("conversation_id", conversationId);
  }
  files.forEach((file) => formData.append("files", file));
  return formData;
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

export const agentApi = {
  /**
   * 上传图片（包含缩略图生成逻辑）
   */
  uploadImages(files: File[], conversationId?: string) {
    return postForm<AttachmentItem[]>(
      "/chat/attachments/images/upload",
      buildUploadFormData(files, conversationId),
    );
  },

  /**
   * 上传普通文件
   */
  uploadFiles(files: File[], conversationId?: string) {
    return postForm<AttachmentItem[]>(
      "/chat/attachments/files/upload",
      buildUploadFormData(files, conversationId),
    );
  },

  /**
   * 调用智能体（SSE 流式）
   */
  send2AgentStream(
    agentId: string,
    payload: Send2AgentPayload,
    config: AgentConfig,
    callbacks: {
      onToken: (token: string) => void;
      onDone: (data: Record<string, unknown>) => void;
      onError: (err: Error) => void;
    },
  ) {
    return requestStream(
      `/chat/agent/${agentId}/run/stream`,
      { ...payload, config },
      callbacks,
    );
  },

  /**
   * 获取会话列表
   */
  getConversations() {
    return get<ConversationSummary[]>("/chat/conversations");
  },

  /**
   * 获取会话消息历史
   */
  getConversationMessages(conversationId: string) {
    return get<MessageResponse[]>(
      `/chat/conversations/${conversationId}/messages`,
    );
  },

  /**
   * 删除会话
   */
  deleteConversation(conversationId: string) {
    return del(`/chat/conversations/${conversationId}`);
  },
};
