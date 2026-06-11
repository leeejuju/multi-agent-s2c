import { Brush, Copy, Crop, Download, ExternalLink, MessageSquare, Trash2 } from "lucide-react";

import { type ImageContainerMenuProps } from "./ImageContainerMenu.props";

export default function ImageContainerMenu({
  node,
  onClose,
  onRemove,
}: ImageContainerMenuProps) {
  const image =
    node.images?.[0] ??
    (node.previewUrl
      ? {
          id: `${node.id}-preview`,
          title: node.title || "image",
          src: node.previewUrl,
        }
      : null);

  const openImage = () => {
    if (image?.src) {
      window.open(image.src, "_blank", "noopener,noreferrer");
    }
    onClose();
  };

  const copyImageUrl = () => {
    if (image?.src && navigator.clipboard) {
      void navigator.clipboard.writeText(image.src);
    }
    onClose();
  };

  const downloadImage = () => {
    if (!image?.src) {
      onClose();
      return;
    }

    const link = document.createElement("a");
    link.href = image.src;
    link.download = image.title || "image";
    link.rel = "noreferrer";
    document.body.appendChild(link);
    link.click();
    link.remove();
    onClose();
  };

  return (
    <>
      <button className="menu-item" onClick={openImage} type="button">
        <ExternalLink size={16} />
        <span>Open image</span>
      </button>
      <button className="menu-item" onClick={copyImageUrl} type="button">
        <Copy size={16} />
        <span>Copy URL</span>
      </button>
      <button className="menu-item" onClick={downloadImage} type="button">
        <Download size={16} />
        <span>Download</span>
      </button>
      <div className="menu-divider" />
      <button className="menu-item" onClick={onClose} type="button">
        <Crop size={16} />
        <span>Crop</span>
      </button>
      <button className="menu-item" onClick={onClose} type="button">
        <Brush size={16} />
        <span>Mask paint</span>
      </button>
      <div className="menu-divider" />
      <button className="menu-item is-primary" onClick={onClose} type="button">
        <MessageSquare size={16} />
        <span>Ask Agent</span>
      </button>
      <div className="menu-divider" />
      <button className="menu-item is-danger" onClick={onRemove} type="button">
        <Trash2 size={16} />
        <span>Remove container</span>
      </button>
    </>
  );
}
