import AgentContainerMenu from "../AgentContainerMenu";
import AttachmentContainerMenu from "../AttachmentContainerMenu";
import ImageContainerMenu from "../ImageContainerMenu";
import { type ContainerContextMenuProps } from "./ContainerContextMenu.props";
import "./ContainerContextMenu.css";

export default function ContainerContextMenu({
  node,
  onClose,
  onRemove,
  x,
  y,
}: ContainerContextMenuProps) {
  return (
    <div
      className="canvas-context-menu"
      onClick={(event) => event.stopPropagation()}
      style={{ left: x, top: y }}
    >
      {node.type === "image" && (
        <ImageContainerMenu node={node} onClose={onClose} onRemove={onRemove} />
      )}
      {node.type === "agent" && (
        <AgentContainerMenu node={node} onClose={onClose} onRemove={onRemove} />
      )}
      {node.type === "attachment" && (
        <AttachmentContainerMenu node={node} onClose={onClose} onRemove={onRemove} />
      )}
    </div>
  );
}
