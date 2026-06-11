import { motion } from "motion/react";

import { type AgentContainerProps } from "./AgentContainer.props";
import "./AgentContainer.css";

export default function AgentContainer({
  isSelected,
  node,
  onContextMenu,
  onPointerDown,
}: AgentContainerProps) {
  return (
    <motion.article
      className={`grid-node group agent-container is-agent ${isSelected ? "is-selected" : ""}`}
      onContextMenu={onContextMenu}
      onPointerDown={onPointerDown}
      style={{
        height: node.height,
        left: node.x,
        top: node.y,
        width: node.width,
      }}
    >
      <span className="agent-container-accent" />
      <h3 className="agent-container-title">{node.title}</h3>
      <p className="agent-container-subtitle">{node.subtitle}</p>
    </motion.article>
  );
}
