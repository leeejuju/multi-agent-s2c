import { CSSProperties, PointerEvent, WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import { Brush, Crop, MessageSquare, Trash2 } from "lucide-react";
import { useWorkspaceStore, type CanvasNode } from "@/store/workspace";
import NodeContainer from "@/components/NodeContainer";
import "./GridCanvas.css";

type ContextMenuState = {
  show: boolean;
  x: number;
  y: number;
  nodeId: string;
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
  nodeId: string;
  startClientX: number;
  startClientY: number;
  originNodeX: number;
  originNodeY: number;
};

const GRID_SIZE = 24;
const MIN_SCALE = 0.1;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.08;

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
  nodeId: "",
  startClientX: 0,
  startClientY: 0,
  originNodeX: 0,
  originNodeY: 0,
};

const defaultContextMenu: ContextMenuState = {
  show: false,
  x: 0,
  y: 0,
  nodeId: "",
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export default function GridCanvas() {
  const viewportRef = useRef<HTMLElement | null>(null);
  const { nodes, updateNodePosition, removeNode } = useWorkspaceStore();
  const [panX, setPanX] = useState(28);
  const [panY, setPanY] = useState(28);
  const [scale, setScale] = useState(1);
  const [panState, setPanState] = useState<PanState>(defaultPanState);
  const [dragState, setDragState] = useState<DragState>(defaultDragState);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(defaultContextMenu);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.key === "Backspace" || event.key === "Delete") && selectedNodeId) {
        // Only trigger if not typing in an input/textarea
        const isInput = document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA";
        if (!isInput) {
          removeNode(selectedNodeId);
          setSelectedNodeId(null);
        }
      }
    };

    const closeMenu = () => setContextMenu(defaultContextMenu);
    
    // Explicitly prevent browser native zoom when hovering over the canvas
    const handleWheel = (e: globalThis.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
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
  }, [selectedNodeId, removeNode]);

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

  const releasePointer = (pointerId: number) => {
    viewportRef.current?.releasePointerCapture(pointerId);
  };

  const onViewportPointerDown = (event: PointerEvent<HTMLElement>) => {
    // Clear selection on background click (left click)
    if (event.button === 0) {
      setSelectedNodeId(null);
    }

    // Trigger panning on middle mouse button (1)
    if (event.button !== 1) {
      return;
    }

    if (
      event.target instanceof Element &&
      event.target.closest(".grid-node")
    ) {
      return;
    }

    event.preventDefault(); // Stop browser auto-scroll

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

  const onNodePointerDown = (
    node: CanvasNode,
    event: PointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

    setSelectedNodeId(node.id);

    setDragState({
      active: true,
      pointerId: event.pointerId,
      nodeId: node.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      originNodeX: node.x,
      originNodeY: node.y,
    });
    viewportRef.current?.setPointerCapture(event.pointerId);
  };

  const onNodeContextMenu = (
    node: CanvasNode,
    event: React.MouseEvent<HTMLElement>,
  ) => {
    if (node.type !== "image") return;
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      show: true,
      x: event.clientX,
      y: event.clientY,
      nodeId: node.id,
    });
  };

  const onViewportPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (dragState.active && event.pointerId === dragState.pointerId) {
      const deltaWorldX = (event.clientX - dragState.startClientX) / scale;
      const deltaWorldY = (event.clientY - dragState.startClientY) / scale;
      const nextX = snapToGrid(dragState.originNodeX + deltaWorldX);
      const nextY = snapToGrid(dragState.originNodeY + deltaWorldY);

      updateNodePosition(dragState.nodeId, nextX, nextY);
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
        {nodes.map((node) => (
          <NodeContainer
            key={node.id}
            node={node}
            isSelected={selectedNodeId === node.id}
            onPointerDown={(event) => onNodePointerDown(node, event)}
            onContextMenu={(event) => onNodeContextMenu(node, event)}
            onRemove={removeNode}
          />
        ))}
      </div>

      {contextMenu.show && (
        <div 
          className="canvas-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="menu-item" onClick={() => setContextMenu(defaultContextMenu)}>
            <Crop size={16} />
            <span>裁剪</span>
          </button>
          <button className="menu-item" onClick={() => setContextMenu(defaultContextMenu)}>
            <Brush size={16} />
            <span>涂抹</span>
          </button>
          <div className="menu-divider" />
          <button className="menu-item is-primary" onClick={() => setContextMenu(defaultContextMenu)}>
            <MessageSquare size={16} />
            <span>Ask Agent</span>
          </button>
          <div className="menu-divider" />
          <button 
            className="menu-item text-[#ff3b30]" 
            onClick={() => {
              removeNode(contextMenu.nodeId);
              setSelectedNodeId(null);
              setContextMenu(defaultContextMenu);
            }}
          >
            <Trash2 size={16} />
            <span>删除</span>
          </button>
        </div>
      )}
    </section>
  );
}
