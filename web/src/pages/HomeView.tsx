import { useState } from "react";

import AgentChat from "@/components/AgentChat";
import DynamicIsland from "@/components/DynamicIsland";
import GridCanvas from "@/components/GridCanvas";
import LibraryDrawer from "@/components/LibraryDrawer";
import SettingsPanel from "@/components/SettingsPanel";
import Sidebar from "@/components/Sidebar";
import WorkStudioPanel from "@/components/WorkStudioPanel";

export default function HomeView() {
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [workStudioOpen, setWorkStudioOpen] = useState(false);

  return (
    <main className="flex h-screen w-screen relative overflow-hidden bg-main-background">
      {/* Interactive Infinite Canvas */}
      <GridCanvas />

      <Sidebar
        onOpenLibrary={() => {
          setLibraryOpen(true);
          setSettingsOpen(false);
          setWorkStudioOpen(false);
        }}
        onOpenSettings={() => {
          setSettingsOpen(true);
          setLibraryOpen(false);
          setWorkStudioOpen(false);
        }}
        onOpenWorkStudio={() => {
          setWorkStudioOpen(true);
          setLibraryOpen(false);
          setSettingsOpen(false);
        }}
      />

      {/* Center hint */}
      <section className="workspace-main flex-1 h-full relative pointer-events-none">
        <DynamicIsland />
        {/* <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
        </motion.div> */}
      </section>

      <AgentChat />

      <WorkStudioPanel
        open={workStudioOpen}
        onClose={() => setWorkStudioOpen(false)}
      />

      <LibraryDrawer
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </main>
  );
}
