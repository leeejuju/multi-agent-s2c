import { X } from "lucide-react";
import { motion } from "motion/react";

import { type ImageContainerProps } from "./ImageContainer.props";
import "./ImageContainer.css";

export default function ImageContainer({
  isSelected,
  node,
  onContextMenu,
  onImageLoad,
  onPointerDown,
  onRemove,
}: ImageContainerProps) {
  const imageItems =
    node.images ??
    (node.previewUrl
      ? [
          {
            id: `${node.id}-preview`,
            title: node.title || "Image",
            src: node.previewUrl,
          },
        ]
      : []);

  return (
    <motion.article
      className={`grid-node group image-container is-image ${imageItems.length > 1 ? "has-multiple-images" : ""} ${isSelected ? "is-selected" : ""}`}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      style={{
        height: node.height,
        left: node.x,
        top: node.y,
        width: node.width,
      }}
      transition={{ damping: 18, mass: 0.42, stiffness: 360, type: "spring" }}
      whileHover={{ scale: 1.018, y: -4 }}
      whileTap={{ scale: 0.996 }}
    >
      <div aria-hidden="true" className="image-node-drag-handle">
        <span />
        <span />
      </div>
      <button
        aria-label="Remove image container"
        className="remove-node-btn is-visible"
        onClick={(event) => {
          event.stopPropagation();
          onRemove(node.id);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        title="Remove image container"
        type="button"
      >
        <X size={14} />
      </button>

      {imageItems.map((image) => (
        <img
          alt={image.title}
          className="image-node-media"
          draggable={false}
          key={image.id}
          onLoad={(event) => {
            onImageLoad?.(
              node,
              image.id,
              event.currentTarget.naturalWidth,
              event.currentTarget.naturalHeight,
              imageItems.length,
            );
          }}
          src={image.src}
        />
      ))}
    </motion.article>
  );
}
