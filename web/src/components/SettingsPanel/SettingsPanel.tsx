import { Button, Select, Switch } from "antd";
import { X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";

import {
  getSettingsPanelMotion,
  settingsOverlayMotion,
} from "@/assets/animations/SettingsPanel.motion";
import "./SettingsPanel.css";

type SettingsPanelProps = {
  onClose: () => void;
  open: boolean;
};

export default function SettingsPanel({ onClose, open }: SettingsPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const panelMotion = getSettingsPanelMotion(shouldReduceMotion);
  const [compactMode, setCompactMode] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [theme, setTheme] = useState("system");

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
            >
              <header className="settings-header">
                <h2>Settings</h2>
                <button
                  aria-label="Close settings"
                  className="settings-icon-btn"
                  onClick={onClose}
                  title="Close"
                  type="button"
                >
                  <X size={18} />
                </button>
              </header>

              <div className="settings-body">
                <section className="settings-section">
                  <div className="settings-row">
                    <span className="settings-row-label">Theme</span>
                    <Select
                      onChange={setTheme}
                      options={[
                        { label: "System", value: "system" },
                        { label: "Light", value: "light" },
                        { label: "Dark", value: "dark" },
                      ]}
                      size="small"
                      value={theme}
                    />
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">Compact messages</span>
                    <Switch checked={compactMode} onChange={setCompactMode} />
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">Auto save drafts</span>
                    <Switch checked={autoSave} onChange={setAutoSave} />
                  </div>
                </section>

                <section className="settings-section">
                  <div className="settings-row">
                    <span className="settings-row-label">Account</span>
                    <Button size="small" type="text">
                      Manage
                    </Button>
                  </div>
                  <div className="settings-row">
                    <span className="settings-row-label">Version</span>
                    <span className="settings-row-value">Local</span>
                  </div>
                </section>
              </div>
            </section>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
