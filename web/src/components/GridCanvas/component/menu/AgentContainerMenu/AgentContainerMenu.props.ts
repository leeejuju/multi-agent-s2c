import { type CanvasNode } from "@/store/workspace";

export type AgentContainerMenuProps = {
  node: CanvasNode;
  onClose: () => void;
  onRemove: () => void;
};
