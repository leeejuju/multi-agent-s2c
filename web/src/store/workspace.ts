import { create } from "zustand";

export type NodeType = "agent" | "attachment" | "image";

export type CanvasImageSource = "generated" | "upload";

export interface CanvasImageItem {
  id: string;
  title: string;
  src: string;
  source: CanvasImageSource;
  objectUrl?: string;
  createdAt: number;
}

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
  // For image node/container
  previewUrl?: string;
  images?: CanvasImageItem[];
}

interface WorkspaceState {
  nodes: CanvasNode[];
  addNode: (node: CanvasNode) => void;
  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  upsertImageContainer: (images: CanvasImageItem[]) => void;
  removeImageFromContainer: (imageId: string) => void;
  removeNode: (id: string) => void;
  clearNodesByType: (type: NodeType) => void;
}

export const IMAGE_CONTAINER_NODE_ID = "image-container";

const initialNodes: CanvasNode[] = [];

function revokeImageUrl(image?: CanvasImageItem) {
  if (image?.objectUrl?.startsWith("blob:")) {
    URL.revokeObjectURL(image.objectUrl);
  }
}

function revokeNodeUrls(node?: CanvasNode) {
  node?.images?.forEach(revokeImageUrl);
  if (
    node?.previewUrl?.startsWith("blob:") &&
    !node.images?.some((image) => image.objectUrl === node.previewUrl)
  ) {
    URL.revokeObjectURL(node.previewUrl);
  }
}

function buildImageContainer(images: CanvasImageItem[]): CanvasNode {
  return {
    id: IMAGE_CONTAINER_NODE_ID,
    type: "image",
    title: "Image Container",
    subtitle: "Uploaded and generated images",
    x: 360,
    y: 168,
    width: 432,
    height: 368,
    count: images.length,
    images,
    previewUrl: images[0]?.src,
  };
}

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
  upsertImageContainer: (images) =>
    set((state) => {
      if (images.length === 0) return state;

      const existingNode = state.nodes.find((n) => n.id === IMAGE_CONTAINER_NODE_ID);
      const currentImages = existingNode?.images ?? [];
      const nextImages = [...currentImages];

      images.forEach((image) => {
        const index = nextImages.findIndex(
          (item) => item.id === image.id || item.src === image.src,
        );
        if (index >= 0) {
          const previous = nextImages[index];
          if (
            previous.objectUrl?.startsWith("blob:") &&
            previous.objectUrl !== image.objectUrl
          ) {
            URL.revokeObjectURL(previous.objectUrl);
          }
          nextImages[index] = { ...previous, ...image };
          return;
        }
        nextImages.push(image);
      });

      const imageContainer = existingNode
        ? {
            ...existingNode,
            count: nextImages.length,
            images: nextImages,
            previewUrl: nextImages[0]?.src,
          }
        : buildImageContainer(nextImages);

      if (!existingNode) {
        return { nodes: [...state.nodes, imageContainer] };
      }

      return {
        nodes: state.nodes.map((node) =>
          node.id === IMAGE_CONTAINER_NODE_ID ? imageContainer : node,
        ),
      };
    }),
  removeImageFromContainer: (imageId) =>
    set((state) => {
      const imageContainer = state.nodes.find((n) => n.id === IMAGE_CONTAINER_NODE_ID);
      if (!imageContainer?.images) return state;

      const removed = imageContainer.images.find((image) => image.id === imageId);
      revokeImageUrl(removed);

      const nextImages = imageContainer.images.filter((image) => image.id !== imageId);
      if (nextImages.length === 0) {
        return {
          nodes: state.nodes.filter((node) => node.id !== IMAGE_CONTAINER_NODE_ID),
        };
      }

      return {
        nodes: state.nodes.map((node) =>
          node.id === IMAGE_CONTAINER_NODE_ID
            ? {
                ...node,
                count: nextImages.length,
                images: nextImages,
                previewUrl: nextImages[0]?.src,
              }
            : node,
        ),
      };
    }),
  removeNode: (id) =>
    set((state) => {
      const node = state.nodes.find((n) => n.id === id);
      revokeNodeUrls(node);
      return {
        nodes: state.nodes.filter((n) => n.id !== id),
      };
    }),
  clearNodesByType: (type) =>
    set((state) => {
      state.nodes.forEach((n) => {
        if (n.type === type) {
          revokeNodeUrls(n);
        }
      });
      return {
        nodes: state.nodes.filter((n) => n.type !== type),
      };
    }),
}));
