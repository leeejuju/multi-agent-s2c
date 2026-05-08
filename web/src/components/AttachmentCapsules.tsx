import {
  File as FileIcon,
  FileArchive,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import type { ComponentType } from "react";

type AttachmentLike = {
  id?: string;
  name?: string;
  file_name?: string;
  uploading?: boolean;
};

type ImageLike = {
  id?: string;
  src: string;
  file?: File;
  fileName?: string;
  uploading?: boolean;
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
  "7z": FileArchive,
};

function getFileExtension(file: AttachmentLike) {
  const filename = file.name || file.file_name || "";
  return filename.split(".").pop()?.toLowerCase() || "";
}

function resolveFileIcon(file: AttachmentLike) {
  return fileIconMap[getFileExtension(file)] || FileIcon;
}

export default function AttachmentCapsules({
  images,
  attachments,
  onRemoveAttachment,
  onRemoveImage,
}: Props) {
  return (
    <div className="attachment-capsules">
      {images.map((image, index) => (
        <div
          className={`attachment-capsule ${image.uploading ? "is-uploading" : ""}`}
          key={image.id || `image-${index}`}
        >
          <img
            alt={image.fileName || image.file?.name || "image"}
            className="attachment-thumb"
            src={image.src}
          />
          <span className="attachment-name">
            {image.file?.name || image.fileName || "Image"}
          </span>
          <button
            aria-label="Remove image"
            className="attachment-remove"
            onClick={() => onRemoveImage(index)}
            type="button"
          >
            <X size={14} />
          </button>
        </div>
      ))}

      {attachments.map((file, index) => {
        const Icon = file.uploading ? Loader2 : resolveFileIcon(file);
        return (
          <div
            className={`attachment-capsule ${file.uploading ? "is-uploading" : ""}`}
            key={file.id || `file-${index}`}
          >
            <span className="attachment-file-icon">
              <Icon size={14} />
            </span>
            <span className="attachment-name">
              {file.name || file.file_name || "Attachment"}
            </span>
            <button
              aria-label="Remove attachment"
              className="attachment-remove"
              onClick={() => onRemoveAttachment(index)}
              type="button"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
