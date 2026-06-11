import { CSSProperties, PointerEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react";

import { useWorkspaceStore, type CanvasNode } from "@/store/workspace";
import AgentContainer from "./component/AgentContainer";
import AttachmentContainer from "./component/AttachmentContainer";
import ImageContainer from "./component/ImageContainer";
import ContainerContextMenu from "./component/menu/ContainerContextMenu";
import "./GridCanvas.css";

type ContextMenuState = {
  show: boolean;
  x: number;
  y: number;
  containerId: string;
};

type PanState = {
  active: boolean;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  originPanX: number;
  originPanY: number;
};

type DragState = {
  active: boolean;
  pointerId: number;
  containerId: string;
  startClientX: number;
  startClientY: number;
  originContainerX: number;
  originContainerY: number;
};

const GRID_SIZE = 24;
const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.08;
const SINGLE_IMAGE_MAX_WIDTH = 560;
const SINGLE_IMAGE_MAX_HEIGHT = 520;
const SINGLE_IMAGE_MIN_WIDTH = 220;
const SINGLE_IMAGE_MIN_HEIGHT = 160;

const defaultPanState: PanState = {
  active: false,
  pointerId: -1,
  startClientX: 0,
  startClientY: 0,
  originPanX: 0,
  originPanY: 0,
};

const defaultDragState: DragState = {
  active: false,
  pointerId: -1,
  containerId: "",
  startClientX: 0,
  startClientY: 0,
  originContainerX: 0,
  originContainerY: 0,
};

const defaultContextMenu: ContextMenuState = {
  show: false,
  x: 0,
  y: 0,
  containerId: "",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

function getFittedImageNodeSize(
  naturalWidth: number,
  naturalHeight: number,
  imageCount: number,
) {
  const safeWidth = naturalWidth > 0 ? naturalWidth : 1;
  const safeHeight = naturalHeight > 0 ? naturalHeight : 1;
  const aspectRatio = safeWidth / safeHeight;

  if (imageCount > 1) {
    const columns = Math.ceil(Math.sqrt(imageCount));
    const rows = Math.ceil(imageCount / columns);
    const tileWidth = aspectRatio >= 1 ? 220 : 172;
    const tileHeight = tileWidth / aspectRatio;
    return {
      width: snapToGrid(clamp(columns * tileWidth + (columns - 1) * 8 + 16, 320, 640)),
      height: snapToGrid(clamp(rows * tileHeight + (rows - 1) * 8 + 16, 220, 560)),
    };
  }

  let width = clamp(safeWidth, SINGLE_IMAGE_MIN_WIDTH, SINGLE_IMAGE_MAX_WIDTH);
  let height = width / aspectRatio;

  if (height > SINGLE_IMAGE_MAX_HEIGHT) {
    height = SINGLE_IMAGE_MAX_HEIGHT;
    width = height * aspectRatio;
  }
  if (height < SINGLE_IMAGE_MIN_HEIGHT) {
    height = SINGLE_IMAGE_MIN_HEIGHT;
    width = height * aspectRatio;
  }

  return {
    width: snapToGrid(clamp(width, SINGLE_IMAGE_MIN_WIDTH, SINGLE_IMAGE_MAX_WIDTH)),
    height: snapToGrid(clamp(height, SINGLE_IMAGE_MIN_HEIGHT, SINGLE_IMAGE_MAX_HEIGHT)),
  };
}

export default function GridCanvas() {
  const viewportRef = useRef<HTMLElement | null>(null);
  const { nodes, updateNode, updateNodePosition, removeNode } = useWorkspaceStore();
  const [panX, setPanX] = useState(28);
  const [panY, setPanY] = useState(28);
  const [scale, setScale] = useState(1);
  const [panState, setPanState] = useState<PanState>(defaultPanState);
  const [dragState, setDragState] = useState<DragState>(defaultDragState);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(defaultContextMenu);
  const [selectedContainerId, setSelectedContainerId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Backspace" || event.key === "Delete") && selectedContainerId) {
        const isInput =
          document.activeElement?.tagName === "INPUT" ||
          document.activeElement?.tagName === "TEXTAREA";
        if (!isInput) {
          removeNode(selectedContainerId);
          setSelectedContainerId(null);
        }
      }
    };

    const closeMenu = () => setContextMenu(defaultContextMenu);

    const handleWheel = (event: globalThis.WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
      }
    };

    const viewport = viewportRef.current;
    if (viewport) {
      viewport.addEventListener("wheel", handleWheel, { passive: false });
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("click", closeMenu);

    return () => {
      if (viewport) {
        viewport.removeEventListener("wheel", handleWheel);
      }
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("click", closeMenu);
    };
  }, [selectedContainerId, removeNode]);

  const workspaceStyle = useMemo<CSSProperties>(
    () => ({
      transform: `translate(${panX}px, ${panY}px) scale(${scale})`,
    }),
    [panX, panY, scale],
  );

  const gridBackgroundStyle = useMemo<CSSProperties>(
    () => ({
      backgroundPosition: `${panX}px ${panY}px`,
      backgroundSize: `${GRID_SIZE * scale}px ${GRID_SIZE * scale}px`,
    }),
    [panX, panY, scale],
  );

  const contextContainer = useMemo(
    () => nodes.find((node) => node.id === contextMenu.containerId),
    [contextMenu.containerId, nodes],
  );

  const closeContextMenu = () => setContextMenu(defaultContextMenu);

  const onImageLoad = (
    node: CanvasNode,
    _imageId: string,
    naturalWidth: number,
    naturalHeight: number,
    imageCount: number,
  ) => {
    const nextSize = getFittedImageNodeSize(naturalWidth, naturalHeight, imageCount);
    if (
      Math.abs(node.width - nextSize.width) < 2 &&
      Math.abs(node.height - nextSize.height) < 2
    ) {
      return;
    }
    updateNode(node.id, nextSize);
  };

  const releasePointer = (pointerId: number) => {
    viewportRef.current?.releasePointerCapture(pointerId);
  };

  const onViewportPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.button === 0) {
      setSelectedContainerId(null);
    }

    if (event.button !== 1) {
      return;
    }

    if (event.target instanceof Element && event.target.closest(".grid-node")) {
      return;
    }

    event.preventDefault();

    setPanState({
      active: true,
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originPanX: panX,
      originPanY: panY,
    });
    viewportRef.current?.setPointerCapture(event.pointerId);
  };

  const onContainerPointerDown = (
    node: CanvasNode,
    event: PointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    setSelectedContainerId(node.id);

    setDragState({
      active: true,
      pointerId: event.pointerId,
      containerId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originContainerX: node.x,
      originContainerY: node.y,
    });
    viewportRef.current?.setPointerCapture(event.pointerId);
  };

  const onContainerContextMenu = (
    node: CanvasNode,
    event: React.MouseEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedContainerId(node.id);
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      containerId: node.id,
    });
  };

  const onViewportPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (dragState.active && event.pointerId === dragState.pointerId) {
      const deltaWorldX = (event.clientX - dragState.startClientX) / scale;
      const deltaWorldY = (event.clientY - dragState.startClientY) / scale;
      const nextX = snapToGrid(dragState.originContainerX + deltaWorldX);
      const nextY = snapToGrid(dragState.originContainerY + deltaWorldY);

      updateNodePosition(dragState.containerId, nextX, nextY);
      return;
    }

    if (panState.active && event.pointerId === panState.pointerId) {
      setPanX(panState.originPanX + event.clientX - panState.startClientX);
      setPanY(panState.originPanY + event.clientY - panState.startClientY);
    }
  };

  const onViewportPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (dragState.active && event.pointerId === dragState.pointerId) {
      setDragState(defaultDragState);
      releasePointer(event.pointerId);
      return;
    }

    if (panState.active && event.pointerId === panState.pointerId) {
      setPanState(defaultPanState);
      releasePointer(event.pointerId);
    }
  };

  const onViewportWheel = (event: WheelEvent<HTMLElement>) => {
    event.preventDefault();

    if (!viewportRef.current) {
      return;
    }

    if (!event.ctrlKey && !event.metaKey) {
      setPanX((current) => current - event.deltaX);
      setPanY((current) => current - event.deltaY);
      return;
    }

    const oldScale = scale;
    const direction = event.deltaY < 0 ? 1 : -1;
    const nextScale = clamp(oldScale + direction * ZOOM_STEP, MIN_SCALE, MAX_SCALE);

    if (nextScale === oldScale) {
      return;
    }

    const rect = viewportRef.current.getBoundingClientRect();
    const cursorX = event.clientX - rect.left;
    const cursorY = event.clientY - rect.top;
    const worldX = (cursorX - panX) / oldScale;
    const worldY = (cursorY - panY) / oldScale;

    setScale(nextScale);
    setPanX(cursorX - worldX * nextScale);
    setPanY(cursorY - worldY * nextScale);
  };

  return (
    <section
      aria-label="Agent canvas"
      className={`grid-canvas ${panState.active ? "is-panning" : ""}`}
      onPointerCancel={onViewportPointerUp}
      onPointerDown={onViewportPointerDown}
      onPointerMove={onViewportPointerMove}
      onPointerUp={onViewportPointerUp}
      onWheel={onViewportWheel}
      ref={viewportRef}
    >
      <div className="canvas-grid" style={gridBackgroundStyle} />
      <div className="canvas-workspace" style={workspaceStyle}>
        {nodes.map((node) => {
          if (node.type === "image") {
            return (
              <ImageContainer
                isSelected={selectedContainerId === node.id}
                key={node.id}
                node={node}
                onContextMenu={(event) => onContainerContextMenu(node, event)}
                onImageLoad={onImageLoad}
                onPointerDown={(event) => onContainerPointerDown(node, event)}
                onRemove={removeNode}
              />
            );
          }

          if (node.type === "attachment") {
            return (
              <AttachmentContainer
                isSelected={selectedContainerId === node.id}
                key={node.id}
                node={node}
                onContextMenu={(event) => onContainerContextMenu(node, event)}
                onPointerDown={(event) => onContainerPointerDown(node, event)}
                onRemove={removeNode}
              />
            );
          }

          return (
            <AgentContainer
              isSelected={selectedContainerId === node.id}
              key={node.id}
              node={node}
              onContextMenu={(event) => onContainerContextMenu(node, event)}
              onPointerDown={(event) => onContainerPointerDown(node, event)}
            />
          );
        })}
      </div>

      {contextMenu.show && contextContainer && (
        <ContainerContextMenu
          node={contextContainer}
          onClose={closeContextMenu}
          onRemove={() => {
            removeNode(contextMenu.containerId);
            setSelectedContainerId(null);
            setContextMenu(defaultContextMenu);
          }}
          x={contextMenu.x}
          y={contextMenu.y}
        />
      )}
    </section>
  );
}
