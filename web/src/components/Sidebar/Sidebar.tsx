import { BookOpen, Brush, Crop, Eraser, Lasso, LogOut, Move, Settings } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useAuthStore } from "@/store/auth";
import "./Sidebar.css";

const tools = [
  { key: "move", label: "Move", icon: Move },
  { key: "lasso", label: "Lasso", icon: Lasso },
  { key: "brush", label: "Brush", icon: Brush },
  { key: "eraser", label: "Eraser", icon: Eraser },
  { key: "crop", label: "Crop", icon: Crop },
];

type SidebarProps = {
  onOpenLibrary: () => void;
  onOpenSettings: () => void;
};

export default function Sidebar({ onOpenLibrary, onOpenSettings }: SidebarProps) {
  const [activeTool, setActiveTool] = useState("move");
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return (
    <motion.aside
      aria-label="Image operations"
      className="sidebar-capsule pointer-events-auto absolute left-5 top-1/2 flex flex-col items-center p-3 rounded-[40px] z-30"
      initial={{ x: -100, y: "-50%", opacity: 0 }}
      animate={{ x: 0, y: "-50%", opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <nav className="flex flex-col items-center gap-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              aria-label={tool.label}
              className={`tool-item ${activeTool === tool.key ? "is-active" : ""}`}
              key={tool.key}
              onClick={() => setActiveTool(tool.key)}
              title={tool.label}
              type="button"
            >
              <Icon size={20} strokeWidth={2.2} />
              <span className="tooltip-text">{tool.label}</span>
              {activeTool === tool.key && (
                <motion.div
                  className="active-indicator"
                  layoutId="active-tool"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          );
        })}

        <div className="h-px w-6 bg-border my-2" />

        <button
          aria-label="Library"
          className="tool-item"
          onClick={onOpenLibrary}
          title="Library"
          type="button"
        >
          <BookOpen size={20} strokeWidth={2.2} />
          <span className="tooltip-text">Library</span>
        </button>

        <button
          aria-label="Settings"
          className="tool-item"
          onClick={onOpenSettings}
          title="Settings"
          type="button"
        >
          <Settings size={20} strokeWidth={2.2} />
          <span className="tooltip-text">Settings</span>
        </button>

        <div className="h-px w-6 bg-border my-2" />

        <button
          aria-label="Log out"
          className="tool-item text-[#ff3b30]"
          onClick={() => clearAuth()}
          title="Log out"
          type="button"
        >
          <LogOut size={20} strokeWidth={2.2} />
          <span className="tooltip-text">Log out</span>
        </button>
      </nav>
    </motion.aside>
  );
}
