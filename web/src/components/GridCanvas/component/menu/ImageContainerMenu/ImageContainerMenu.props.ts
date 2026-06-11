import { type CanvasNode } from "@/store/workspace";

export type ImageContainerMenuProps = {
  node: CanvasNode;
  onClose: () => void;
  onRemove: () => void;
};
