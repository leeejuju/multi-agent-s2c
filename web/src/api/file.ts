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

function buildUploadFormData(conversationId: string, files: File[]): FormData {
  const formData = new FormData();
  formData.append("conversation_id", conversationId);
  files.forEach((file) => formData.append("files", file));
  return formData;
}

export const fileApi = {
  uploadImages(conversationId: string, files: File[]) {
    return postForm<AttachmentItem[]>(
      "/files/images",
      buildUploadFormData(conversationId, files),
    );
  },

  uploadDocuments(conversationId: string, files: File[]) {
    return postForm<AttachmentItem[]>(
      "/files/documents",
      buildUploadFormData(conversationId, files),
    );
  },

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
