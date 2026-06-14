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
    <div className="flex flex-wrap gap-2 mb-2">
      {images.map((image, index) => (
        <div
          className={`glass-effect-sm relative flex max-w-[132px] items-center gap-1.5 overflow-hidden rounded-full bg-card-background p-0.5 pr-1.5 ${image.error ? "border border-[#ff3b30]/40" : ""}`}
          key={image.id || `image-${index}`}
          title={image.error}
        >
          <img
            alt={image.fileName || image.file?.name || "image"}
            className="h-[22px] w-[22px] rounded-full bg-card-background object-cover"
            src={image.src}
          />
          <span className="min-w-0 flex-1 truncate text-[11px] font-normal text-on-surface">
            {image.file?.name || image.fileName || "Image"}
          </span>
          <button
            aria-label="Remove image"
            className="flex h-[18px] w-[18px] flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-[#ff3b30]"
            onClick={() => onRemoveImage(index)}
            type="button"
          >
            <X size={12} />
          </button>
          {image.uploading && <UploadProgressOverlay progress={getProgress(image)} />}
        </div>
      ))}

      {attachments.map((file, index) => {
        const Icon = resolveFileIcon(file);
        return (
          <div
            className={`glass-effect-sm relative flex max-w-[132px] items-center gap-1.5 overflow-hidden rounded-full bg-card-background p-0.5 pr-1.5 ${file.error ? "border border-[#ff3b30]/40" : ""}`}
            key={file.id || `file-${index}`}
            title={file.error}
          >
            <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
              <Icon size={12} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-normal text-on-surface">
              {file.name || file.file_name || "Attachment"}
            </span>
            <button
              aria-label="Remove attachment"
              className="flex h-[18px] w-[18px] flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-[#ff3b30]"
              onClick={() => onRemoveAttachment(index)}
              type="button"
            >
              <X size={12} />
            </button>
            {file.uploading && <UploadProgressOverlay progress={getProgress(file)} />}
          </div>
        );
      })}
    </div>
  );
}
