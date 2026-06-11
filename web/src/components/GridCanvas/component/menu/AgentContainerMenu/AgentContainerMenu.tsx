import { MessageSquare, Pencil, Trash2 } from "lucide-react";

import { type AgentContainerMenuProps } from "./AgentContainerMenu.props";

export default function AgentContainerMenu({
  onClose,
  onRemove,
}: AgentContainerMenuProps) {
  return (
    <>
      <button className="menu-item is-primary" onClick={onClose} type="button">
        <MessageSquare size={16} />
        <span>Ask Agent</span>
      </button>
      <button className="menu-item" onClick={onClose} type="button">
        <Pencil size={16} />
        <span>Edit agent</span>
      </button>
      <div className="menu-divider" />
      <button className="menu-item is-danger" onClick={onRemove} type="button">
        <Trash2 size={16} />
        <span>Remove agent</span>
      </button>
    </>
  );
}
