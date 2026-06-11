import { type CanvasNode } from "@/store/workspace";

export type ContainerContextMenuProps = {
  node: CanvasNode;
  onClose: () => void;
  onRemove: () => void;
  x: number;
  y: number;
};
