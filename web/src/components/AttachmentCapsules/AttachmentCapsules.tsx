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
    <div className="flex flex-wrap gap-2 mb-2">
      {images.map((image, index) => (
        <div
          className={`flex max-w-[140px] items-center gap-1.5 rounded-full p-0.5 pr-2 glass-effect-sm bg-white ${image.uploading ? "opacity-70" : ""}`}
          key={image.id || `image-${index}`}
        >
          <img
            alt={image.fileName || image.file?.name || "image"}
            className="h-6 w-6 rounded-full object-cover bg-white"
            src={image.src}
          />
          <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-on-surface">
            {image.file?.name || image.fileName || "Image"}
          </span>
          <button
            aria-label="Remove image"
            className="flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-[#ff3b30]"
            onClick={() => onRemoveImage(index)}
            type="button"
          >
            <X size={12} />
          </button>
        </div>
      ))}

      {attachments.map((file, index) => {
        const Icon = file.uploading ? Loader2 : resolveFileIcon(file);
        return (
          <div
            className={`flex max-w-[140px] items-center gap-1.5 rounded-full p-0.5 pr-2 glass-effect-sm bg-white ${file.uploading ? "opacity-70" : ""}`}
            key={file.id || `file-${index}`}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-variant text-on-surface-variant">
              <Icon size={12} className={file.uploading ? "animate-spin" : ""} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-on-surface">
              {file.name || file.file_name || "Attachment"}
            </span>
            <button
              aria-label="Remove attachment"
              className="flex h-5 w-5 flex-shrink-0 cursor-pointer items-center justify-center rounded-full text-on-surface-variant transition-colors hover:text-[#ff3b30]"
              onClick={() => onRemoveAttachment(index)}
              type="button"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
