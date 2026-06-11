import { type MouseEvent, type PointerEvent } from "react";

import { type CanvasNode } from "@/store/workspace";

export type AttachmentContainerProps = {
  isSelected: boolean;
  node: CanvasNode;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onRemove: (id: string) => void;
};
