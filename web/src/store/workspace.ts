import { create } from "zustand";

export type NodeType = "agent" | "attachment";

export interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  // For agent nodes
  title?: string;
  subtitle?: string;
  // For attachment node
  count?: number;
}

interface WorkspaceState {
  nodes: CanvasNode[];
  addNode: (node: CanvasNode) => void;
  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  removeNode: (id: string) => void;
  clearNodesByType: (type: NodeType) => void;
}

const initialNodes: CanvasNode[] = [
  {
    id: "agent-1",
    type: "agent",
    title: "Planner",
    subtitle: "Breaks down the script",
    x: 120,
    y: 120,
    width: 220,
    height: 104,
  },
  {
    id: "agent-2",
    type: "agent",
    title: "Executor",
    subtitle: "Runs editing steps",
    x: 408,
    y: 120,
    width: 220,
    height: 104,
  },
  {
    id: "agent-3",
    type: "agent",
    title: "Memory",
    subtitle: "Keeps project context",
    x: 120,
    y: 304,
    width: 220,
    height: 104,
  },
];

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  nodes: initialNodes,
  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),
  updateNode: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  updateNodePosition: (id, x, y) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
    })),
  removeNode: (id) =>
    set((state) => {
      const node = state.nodes.find((n) => n.id === id);
      if (node?.previewUrl) {
        URL.revokeObjectURL(node.previewUrl);
      }
      return {
        nodes: state.nodes.filter((n) => n.id !== id),
      };
    }),
  clearNodesByType: (type) =>
    set((state) => {
      state.nodes.forEach((n) => {
        if (n.type === type && n.previewUrl) {
          URL.revokeObjectURL(n.previewUrl);
        }
      });
      return {
        nodes: state.nodes.filter((n) => n.type !== type),
      };
    }),
}));
