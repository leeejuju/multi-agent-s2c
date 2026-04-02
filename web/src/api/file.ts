import { del, get, post, postForm } from "./index";

export interface AttachmentItem {
  id: string;
  conversation_id: string;
  user_id: string;
  file_name: string;
  content_type: string;
  file_size: number;
  object_key: string;
  category: "image" | "document";
  access_url: string;
}

export interface AttachmentAccessUrlResponse {
  attachment_id: string;
  access_url: string;
}

function buildUploadFormData(files: File[], conversationId?: string): FormData {
  const formData = new FormData();
  if (conversationId) {
    formData.append("conversation_id", conversationId);
  }
  files.forEach((file) => formData.append("files", file));
  return formData;
}

export const fileApi = {
  uploadImages(files: File[], conversationId?: string) {
    return postForm<AttachmentItem[]>(
      "/files/images",
      buildUploadFormData(files, conversationId),
    );
  },

  uploadDocuments(files: File[], conversationId?: string) {
    return postForm<AttachmentItem[]>(
      "/files/documents",
      buildUploadFormData(files, conversationId),
    );
  },

  /**
   * @deprecated 建议改用消息 ID 或附件 ID 列表查询
   */
  listConversationAttachments(conversationId: string) {
    return get<AttachmentItem[]>(`/files/conversations/${conversationId}`);
  },

  getAttachmentAccessUrl(attachmentId: string) {
    return post<AttachmentAccessUrlResponse>(`/files/${attachmentId}/access-url`);
  },

  deleteAttachment(attachmentId: string) {
    return del<void>(`/files/${attachmentId}`);
  },
};
