import { type MouseEvent, type PointerEvent } from "react";

import { type CanvasNode } from "@/store/workspace";

export type ImageContainerProps = {
  isSelected: boolean;
  node: CanvasNode;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  onImageLoad?: (
    node: CanvasNode,
    imageId: string,
    naturalWidth: number,
    naturalHeight: number,
    imageCount: number,
  ) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
  onRemove: (id: string) => void;
};
