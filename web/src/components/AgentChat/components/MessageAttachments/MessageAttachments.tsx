import { Download, FileText, Image as ImageIcon } from "lucide-react";
import type { CSSProperties } from "react";

import { type ChatMessageAttachment } from "@/hooks/useChat";
import "./MessageAttachments.css";

function isImageAttachment(attachment: ChatMessageAttachment) {
  return (
    attachment.category === "image" ||
    attachment.content_type.startsWith("image/")
  );
}

type MessageAttachmentsProps = {
  attachments: ChatMessageAttachment[];
};

export default function MessageAttachments({
  attachments,
}: MessageAttachmentsProps) {
  if (attachments.length === 0) return null;

  return (
    <div className={`message-attachments ${attachments.length === 1 ? "is-single" : ""}`}>
      {attachments.map((attachment) => {
        const isImage = isImageAttachment(attachment);
        const href = attachment.access_url;
        const previewUrl = attachment.thumb_url || attachment.access_url;
        const Icon = isImage ? ImageIcon : FileText;
        const uploadProgress = Math.max(
          0,
          Math.min(100, attachment.uploadProgress ?? (attachment.uploading ? 0 : 100)),
        );
        const progressStyle = {
          "--attachment-progress": `${uploadProgress}%`,
        } as CSSProperties;
        const statusText = attachment.uploading
          ? `Uploading ${uploadProgress}%`
          : attachment.error || attachment.parse_error || "";
        const fileSizeText = attachment.file_size
          ? attachment.file_size < 1024
            ? `${attachment.file_size} B`
            : attachment.file_size < 1024 * 1024
              ? `${(attachment.file_size / 1024).toFixed(1)} KB`
              : `${(attachment.file_size / 1024 / 1024).toFixed(1)} MB`
          : "";
        const metaText = statusText || fileSizeText;

        return (
          <a
            className={`message-attachment ${attachment.uploading ? "is-uploading" : ""} ${attachment.error ? "is-error" : ""}`}
            href={href}
            key={attachment.id}
            rel="noreferrer"
            target="_blank"
            title={href || attachment.file_name}
          >
            <span className="message-attachment-thumb">
              {isImage && previewUrl ? (
                <img alt={attachment.file_name} src={previewUrl} />
              ) : (
                <Icon size={16} />
              )}
            </span>
            <span className="message-attachment-copy">
              <span className="message-attachment-name">
                {attachment.file_name}
              </span>
              {metaText && <span className="message-attachment-meta">{metaText}</span>}
            </span>
            {href && !attachment.uploading && (
              <Download className="message-attachment-download" size={14} />
            )}
            {attachment.uploading && (
              <span
                aria-hidden="true"
                className="message-attachment-progress-overlay"
                style={progressStyle}
              >
                <span className="message-attachment-progress-ring" />
              </span>
            )}
          </a>
        );
      })}
    </div>
  );
}
