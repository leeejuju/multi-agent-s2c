import { type MouseEvent, type PointerEvent } from "react";

import { type CanvasNode } from "@/store/workspace";

export type AgentContainerProps = {
  isSelected: boolean;
  node: CanvasNode;
  onContextMenu: (event: MouseEvent<HTMLElement>) => void;
  onPointerDown: (event: PointerEvent<HTMLElement>) => void;
};
