import type { SettingsDetailPanelProps } from "../../types";

export function AccountDetailView({
  activeSecondary,
}: SettingsDetailPanelProps) {
  if (activeSecondary === "profile") {
    return (
      <div className="settings-row-group">
        <div className="settings-row">
          <span className="settings-row-label">Account</span>
          <span className="settings-row-value">Current user</span>
        </div>
      </div>
    );
  }

  if (activeSecondary === "about") {
    return (
      <>
        <div className="settings-row-group">
          <div className="settings-row">
            <span className="settings-row-label">Version</span>
            <span className="settings-row-value">Local</span>
          </div>
        </div>
        <div className="settings-row-group">
          <div className="settings-row">
            <span className="settings-row-label">Build</span>
            <span className="settings-row-value">Community</span>
          </div>
        </div>
      </>
    );
  }

  return null;
}
