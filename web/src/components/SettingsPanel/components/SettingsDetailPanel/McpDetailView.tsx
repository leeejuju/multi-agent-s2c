import { Switch } from "antd";

import type { SettingsDetailPanelProps } from "../../types";

export function McpDetailView({
  activeSecondary,
  mcpEnabled,
  onMcpEnabled,
}: SettingsDetailPanelProps) {
  if (activeSecondary === "connection") {
    return (
      <>
        <div className="settings-row-group">
          <div className="settings-row">
            <span className="settings-row-label">Enable MCP</span>
            <Switch checked={mcpEnabled} onChange={onMcpEnabled} />
          </div>
        </div>
        <div className="settings-row-group">
          <div className="settings-row">
            <span className="settings-row-label">Toolchain endpoint</span>
            <span className="settings-row-value">Not configured</span>
          </div>
        </div>
      </>
    );
  }

  if (activeSecondary === "tools") {
    return (
      <div className="settings-row-group">
        <div className="settings-row">
          <span className="settings-row-label">Tool registration</span>
          <span className="settings-row-value">Available in pipeline mode</span>
        </div>
      </div>
    );
  }

  return null;
}
