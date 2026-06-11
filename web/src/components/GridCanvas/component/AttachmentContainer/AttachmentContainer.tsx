import { FolderOpen, X } from "lucide-react";
import { motion } from "motion/react";

import { type AttachmentContainerProps } from "./AttachmentContainer.props";
import "./AttachmentContainer.css";

export default function AttachmentContainer({
  isSelected,
  node,
  onContextMenu,
  onPointerDown,
  onRemove,
}: AttachmentContainerProps) {
  return (
    <motion.article
      className={`grid-node group attachment-container is-attachment ${isSelected ? "is-selected" : ""}`}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      style={{
        height: node.height,
        left: node.x,
        top: node.y,
        width: node.width,
      }}
    >
      <div className="attachment-node-content">
        <div className="attachment-icon-wrapper">
          <FolderOpen size={24} className="text-on-surface" />
        </div>
        <div className="attachment-info">
          <h4>Attachment Container</h4>
          <span>{node.count || 0} files</span>
        </div>
        <button
          className="remove-node-btn"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(node.id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          title="Remove and Clear Attachments"
          type="button"
        >
          <X size={14} />
        </button>
      </div>
    </motion.article>
  );
}
