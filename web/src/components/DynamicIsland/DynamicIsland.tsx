import { Orbit } from "lucide-react";
import { motion } from "motion/react";
import "./DynamicIsland.css";

export default function DynamicIsland() {
  return (
    <div className="relative z-50 flex justify-center pt-4 pointer-events-none w-full">
      <motion.div
        className="dynamic-island"
        initial={false}
        animate="resting"
        whileHover="expanded"
        variants={{
          resting: {
            width: 42,
            height: 42,
            borderRadius: 21,
          },
          expanded: {
            width: 460,
            height: 72,
            borderRadius: 999,
          },
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 28,
          mass: 1,
        }}
      >
        <div className="island-content-wrapper">
          <motion.div
            className="absolute"
            variants={{
              resting: { opacity: 1, scale: 1 },
              expanded: { opacity: 0, scale: 0.8 },
            }}
          >
            <Orbit size={18} strokeWidth={2.2} />
          </motion.div>
          <motion.div
            className="island-text"
            variants={{
              resting: { opacity: 0, y: 10, pointerEvents: "none" },
              expanded: { opacity: 1, y: 0, pointerEvents: "auto" },
            }}
          >
            <strong className="text-[15px] font-medium">System Active</strong>
            <span className="mt-1 text-[12px] text-on-surface-variant">Canvas initialized and ready for advanced workflows.</span>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
