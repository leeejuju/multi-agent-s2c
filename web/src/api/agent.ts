import { post, postForm } from "./index";

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
 * 智能体响应结构
 */
export interface AgentResponse {
  content: string;
  conversation_id?: string;
  usage?: {
    total_tokens: number;
  };
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
   * 调用智能体运行任务
   */
  async send2Agent(
    agentId: string,
    payload: Send2AgentPayload,
    config: AgentConfig = {},
    options: RequestInit = {},
  ): Promise<AgentResponse> {
    return post<AgentResponse>(
      `/chat/agent/${agentId}/run`,
      {
        ...payload,
        config,
      },
      options,
    );
  },
};
