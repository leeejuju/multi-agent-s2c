import { CSSProperties, PointerEvent, WheelEvent, useMemo, useRef, useState } from "react";
import "./GridCanvas.css";

type GridNode = {
  id: string;
  title: string;
  subtitle: string;
  x: number;
  y: number;
  width: number;
  height: number;
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

const initialNodes: GridNode[] = [
  {
    id: "agent-1",
    title: "Planner",
    subtitle: "Breaks down the script",
    x: 120,
    y: 120,
    width: 220,
    height: 104,
  },
  {
    id: "agent-2",
    title: "Executor",
    subtitle: "Runs editing steps",
    x: 408,
    y: 120,
    width: 220,
    height: 104,
  },
  {
    id: "agent-3",
    title: "Memory",
    subtitle: "Keeps project context",
    x: 120,
    y: 304,
    width: 220,
    height: 104,
  },
];

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

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function snapToGrid(value: number) {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}

export default function GridCanvas() {
  const viewportRef = useRef<HTMLElement | null>(null);
  const [nodes, setNodes] = useState(initialNodes);
  const [panX, setPanX] = useState(28);
  const [panY, setPanY] = useState(28);
  const [scale, setScale] = useState(1);
  const [panState, setPanState] = useState<PanState>(defaultPanState);
  const [dragState, setDragState] = useState<DragState>(defaultDragState);

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
    node: GridNode,
    event: PointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0) {
      return;
    }

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

  const onViewportPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (dragState.active && event.pointerId === dragState.pointerId) {
      const deltaWorldX = (event.clientX - dragState.startClientX) / scale;
      const deltaWorldY = (event.clientY - dragState.startClientY) / scale;
      const nextX = snapToGrid(dragState.originNodeX + deltaWorldX);
      const nextY = snapToGrid(dragState.originNodeY + deltaWorldY);

      setNodes((current) =>
        current.map((node) =>
          node.id === dragState.nodeId
            ? { ...node, x: nextX, y: nextY }
            : node,
        ),
      );
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
          <article
            className="grid-node"
            key={node.id}
            onPointerDown={(event) => onNodePointerDown(node, event)}
            style={{
              height: node.height,
              left: node.x,
              top: node.y,
              width: node.width,
            }}
          >
            <span className="node-accent" />
            <h3>{node.title}</h3>
            <p>{node.subtitle}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
