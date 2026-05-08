import { motion } from "motion/react";

import AgentChat from "@/components/AgentChat";
import DynamicIsland from "@/components/DynamicIsland";
import Sidebar from "@/components/Sidebar";
import GridCanvas from "@/components/GridCanvas";

export default function HomeView() {
  return (
    <main className="flex h-screen w-screen relative overflow-hidden bg-surface">
      {/* Interactive Infinite Canvas */}
      <GridCanvas />

      <Sidebar />

      {/* Center hint */}
      <section className="workspace-main">
        <DynamicIsland />
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-on-surface-variant text-sm opacity-50">
            Start with an idea, or attach files to begin an agent run.
          </p>
        </motion.div>
      </section>

      <AgentChat />
    </main>
  );
}
