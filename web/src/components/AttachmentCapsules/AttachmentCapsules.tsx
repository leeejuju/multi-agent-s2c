import {
  File as FileIcon,
  FileArchive,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  X,
} from "lucide-react";
import type { ComponentType, CSSProperties } from "react";
import "./AttachmentCapsules.css";

type AttachmentLike = {
  id?: string;
  name?: string;
  file_name?: string;
  uploading?: boolean;
  uploadProgress?: number;
  error?: string;
  file?: File;
};

type ImageLike = {
  id?: string;
  src: string;
  file?: File;
  fileName?: string;
  uploading?: boolean;
  uploadProgress?: number;
  error?: string;
};

type Props = {
  images: ImageLike[];
  attachments: AttachmentLike[];
  onRemoveImage: (index: number) => void;
  onRemoveAttachment: (index: number) => void;
};

const fileIconMap: Record<string, ComponentType<{ size?: number }>> = {
  pdf: FileText,
  txt: FileText,
  doc: FileText,
  docx: FileText,
  md: FileCode2,
  markdown: FileCode2,
  json: FileJson,
  csv: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  zip: FileArchive,
  rar: FileArchive,
};

function getFileExtension(file: AttachmentLike) {
  const filename = file.name || file.file_name || "";
  return filename.split(".").pop()?.toLowerCase() || "";
}

function resolveFileIcon(file: AttachmentLike) {
  return fileIconMap[getFileExtension(file)] || FileIcon;
}

function getProgress(item: { uploadProgress?: number }) {
  if (typeof item.uploadProgress !== "number") return 0;
  return Math.max(0, Math.min(100, item.uploadProgress));
}

function UploadProgressOverlay({ progress }: { progress: number }) {
  const ringStyle = {
    ["--attachment-upload-progress" as string]: `${progress}%`,
  } satisfies CSSProperties;
  return (
    <span className="attachment-capsule-upload-progress-overlay pointer-events-none">
      <span
        aria-hidden="true"
        className="attachment-capsule-upload-progress-ring"
        style={ringStyle}
      >
        <span className="attachment-capsule-upload-progress-text">
          {Math.round(progress)}%
        </span>
      </span>
    </span>
  );
}

export default function AttachmentCapsules({
  images,
  attachments,
  onRemoveAttachment,
  onRemoveImage,
}: Props) {
  return (
    <div className="attachment-capsule-list">
      {images.map((image, index) => (
        <div
          className={`attachment-capsule ${image.error ? "is-error" : ""}`}
          key={image.id || `image-${index}`}
          title={image.error}
        >
          <img
            alt={image.fileName || image.file?.name || "image"}
            className="h-9 w-9 rounded-[8px] bg-card-background object-cover"
            src={image.src}
          />
          <span className="min-w-0 flex-1 truncate text-[0.95rem] font-medium text-on-surface">
            {image.file?.name || image.fileName || "Image"}
          </span>
          <button
            aria-label="Remove image"
            className="attachment-capsule-remove"
            onClick={() => onRemoveImage(index)}
            type="button"
          >
            <X size={15} />
          </button>
          {image.uploading && <UploadProgressOverlay progress={getProgress(image)} />}
        </div>
      ))}

      {attachments.map((file, index) => {
        const Icon = resolveFileIcon(file);
        return (
          <div
            className={`attachment-capsule ${file.error ? "is-error" : ""}`}
            key={file.id || `file-${index}`}
            title={file.error}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-[8px] bg-surface-variant text-on-surface-variant">
              <Icon size={17} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[0.95rem] font-medium text-on-surface">
              {file.name || file.file_name || "Attachment"}
            </span>
            <button
              aria-label="Remove attachment"
              className="attachment-capsule-remove"
              onClick={() => onRemoveAttachment(index)}
              type="button"
            >
              <X size={15} />
            </button>
            {file.uploading && <UploadProgressOverlay progress={getProgress(file)} />}
          </div>
        );
      })}
    </div>
  );
}
