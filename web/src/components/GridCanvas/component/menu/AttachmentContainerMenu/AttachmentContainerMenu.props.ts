import { type CanvasNode } from "@/store/workspace";

export type AttachmentContainerMenuProps = {
  node: CanvasNode;
  onClose: () => void;
  onRemove: () => void;
};
