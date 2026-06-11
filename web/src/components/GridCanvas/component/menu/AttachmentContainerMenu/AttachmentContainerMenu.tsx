import { FolderOpen, Trash2, XCircle } from "lucide-react";

import { type AttachmentContainerMenuProps } from "./AttachmentContainerMenu.props";

export default function AttachmentContainerMenu({
  onClose,
  onRemove,
}: AttachmentContainerMenuProps) {
  return (
    <>
      <button className="menu-item is-primary" onClick={onClose} type="button">
        <FolderOpen size={16} />
        <span>Open attachments</span>
      </button>
      <button className="menu-item" onClick={onClose} type="button">
        <XCircle size={16} />
        <span>Clear files</span>
      </button>
      <div className="menu-divider" />
      <button className="menu-item is-danger" onClick={onRemove} type="button">
        <Trash2 size={16} />
        <span>Remove container</span>
      </button>
    </>
  );
}
