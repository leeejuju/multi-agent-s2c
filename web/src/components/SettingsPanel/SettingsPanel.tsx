import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { type PointerEvent, useState } from "react";

import {
  getSettingsPanelMotion,
  settingsOverlayMotion,
} from "@/assets/animations/SettingsPanel.motion";
import "./SettingsPanel.css";
import { SettingsDetailPanel } from "./components/SettingsDetailPanel";
import { SettingsPrimarySidebar } from "./components/SettingsPrimarySidebar";
import { SettingsSecondarySidebar } from "./components/SettingsSecondarySidebar";
import type {
  ModelProviderKey,
  PrimaryKey,
  SecondaryKey,
  SettingsPanelProps,
  SettingsSection,
  SettingsSidebarSectionMap,
} from "./types";

const MODEL_PROVIDER_KEYS: ModelProviderKey[] = [
  "qwen",
  "deepseek",
  "doubao",
  "kimi",
  "zhipu",
  "minimax",
  "google",
  "openai",
];

const PRIMARY_SECTIONS: SettingsSection[] = [
  { key: "models", label: "Models" },
  { key: "mcp", label: "MCP" },
  { key: "account", label: "Account" },
];

const SECONDARY_SECTIONS: SettingsSidebarSectionMap = {
  models: [
    { key: "qwen", label: "Qwen" },
    { key: "deepseek", label: "DeepSeek" },
    { key: "doubao", label: "Doubao" },
    { key: "kimi", label: "Kimi" },
    { key: "zhipu", label: "Zhipu GLM" },
    { key: "minimax", label: "MiniMax" },
    { key: "google", label: "Google" },
    { key: "openai", label: "OpenAI" },
  ],
  mcp: [
    { key: "connection", label: "MCP Connection" },
    { key: "tools", label: "Tools" },
  ],
  chat: [
    { key: "streaming", label: "Streaming" },
    { key: "attachments", label: "Attachments" },
  ],
  interface: [
    { key: "theme", label: "Theme" },
    { key: "layout", label: "Layout" },
  ],
  account: [
    { key: "profile", label: "Profile" },
    { key: "about", label: "About" },
  ],
};

function createProviderRecord<T>(value: T) {
  return MODEL_PROVIDER_KEYS.reduce(
    (record, key) => ({ ...record, [key]: value }),
    {} as Record<ModelProviderKey, T>,
  );
}

export default function SettingsPanel({ onClose, open }: SettingsPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const panelMotion = getSettingsPanelMotion(shouldReduceMotion);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [compactMode, setCompactMode] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [theme, setTheme] = useState("system");
  const [defaultModel, setDefaultModel] = useState("qwen3.5-plus");
  const [enabledProviders, setEnabledProviders] = useState(() =>
    createProviderRecord(false),
  );
  const [mcpEnabled, setMcpEnabled] = useState(false);
  const [providerApiKeys, setProviderApiKeys] = useState(() =>
    createProviderRecord(""),
  );
  const [streamThrottle, setStreamThrottle] = useState("normal");
  const [activePrimary, setActivePrimary] = useState<PrimaryKey>("models");
  const [activeSecondary, setActiveSecondary] = useState<SecondaryKey>("qwen");

  const secondaryItems = SECONDARY_SECTIONS[activePrimary];
  const activeSecondaryTitle =
    secondaryItems.find((item) => item.key === activeSecondary)?.label ??
    secondaryItems[0].label;

  const handleDragStart = (event: PointerEvent<HTMLElement>) => {
    if (event.button !== 0) return;

    event.preventDefault();

    const startX = event.clientX;
    const startY = event.clientY;
    const startPosition = position;

    event.currentTarget.setPointerCapture(event.pointerId);

    const handleMove = (moveEvent: globalThis.PointerEvent) => {
      setPosition({
        x: startPosition.x + moveEvent.clientX - startX,
        y: startPosition.y + moveEvent.clientY - startY,
      });
    };

    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="settings-floating-overlay"
          onClick={onClose}
          {...settingsOverlayMotion}
        >
          <motion.div
            className="settings-floating-shell"
            onClick={(event) => event.stopPropagation()}
            {...panelMotion}
          >
            <section
              aria-modal="true"
              className="settings-floating-panel"
              role="dialog"
              style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
            >
              <header className="settings-header" onPointerDown={handleDragStart}>
                <h2>Settings</h2>
                <button
                  aria-label="Close settings"
                  className="settings-icon-btn"
                  onClick={onClose}
                  onPointerDown={(event) => event.stopPropagation()}
                  title="Close"
                  type="button"
                >
                  <X size={16} />
                </button>
              </header>

              <div className="settings-body">
                <div className="settings-layout">
                  <SettingsPrimarySidebar
                    activePrimary={activePrimary}
                    onSelectPrimary={(primary) => {
                      setActivePrimary(primary);
                      setActiveSecondary(SECONDARY_SECTIONS[primary][0].key);
                    }}
                    sections={PRIMARY_SECTIONS}
                  />

                  <SettingsSecondarySidebar
                    activeSecondary={activeSecondary}
                    items={secondaryItems}
                    onSelectSecondary={setActiveSecondary}
                  />

                  <SettingsDetailPanel
                    activePrimary={activePrimary}
                    activeSecondary={activeSecondary}
                    activeSecondaryTitle={activeSecondaryTitle}
                    autoSave={autoSave}
                    compactMode={compactMode}
                    defaultModel={defaultModel}
                    enabledProviders={enabledProviders}
                    mcpEnabled={mcpEnabled}
                    providerApiKeys={providerApiKeys}
                    streamThrottle={streamThrottle}
                    theme={theme}
                    onAutoSave={setAutoSave}
                    onCompactMode={setCompactMode}
                    onDefaultModel={setDefaultModel}
                    onMcpEnabled={setMcpEnabled}
                    onProviderApiKey={(provider, value) =>
                      setProviderApiKeys((current) => ({
                        ...current,
                        [provider]: value,
                      }))
                    }
                    onProviderEnabled={(provider, value) =>
                      setEnabledProviders((current) => ({
                        ...current,
                        [provider]: value,
                      }))
                    }
                    onStreamThrottle={setStreamThrottle}
                    onTheme={setTheme}
                  />
                </div>
              </div>
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
