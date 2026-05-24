import React from "react";
import { 
  FolderOpen,
  X
} from "lucide-react";
import { type CanvasNode } from "@/store/workspace";

interface NodeContainerProps {
  node: CanvasNode;
  isSelected: boolean;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onContextMenu: (event: React.MouseEvent<HTMLElement>) => void;
  onRemove: (id: string) => void;
}

export default function NodeContainer({
  node,
  isSelected,
  onPointerDown,
  onContextMenu,
  onRemove,
}: NodeContainerProps) {
  return (
    <article
      className={`grid-node group ${node.type === "attachment" ? "is-attachment" : ""} ${isSelected ? "is-selected" : ""}`}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      style={{
        height: node.height,
        left: node.x,
        top: node.y,
        width: node.width,
      }}
    >
      {node.type === "agent" && (
        <>
          <span className="node-accent" />
          <h3>{node.title}</h3>
          <p>{node.subtitle}</p>
        </>
      )}

      {node.type === "attachment" && (
        <div className="attachment-node-content">
          <div className="attachment-icon-wrapper">
            <FolderOpen size={24} className="text-on-surface" />
          </div>
          <div className="attachment-info">
            <h4>附件容器</h4>
            <span>{node.count || 0} 个文件</span>
          </div>
          <button 
            className="remove-node-btn" 
            onClick={(e) => { e.stopPropagation(); onRemove(node.id); }}
            title="Remove and Clear Attachments"
          >
            <X size={14} />
          </button>
        </div>
      )}
    </article>
  );
}
