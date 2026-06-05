import type { ReactNode } from "react";

import type { SettingsDetailPanelProps } from "../../types";
import { AccountDetailView } from "./AccountDetailView";
import { McpDetailView } from "./McpDetailView";
import { ModelProviderDetailView } from "./ModelProviderDetailView";

function renderDetailContent(props: SettingsDetailPanelProps): ReactNode {
  switch (props.activePrimary) {
    case "models":
      return <ModelProviderDetailView {...props} />;
    case "mcp":
      return <McpDetailView {...props} />;
    case "account":
      return <AccountDetailView {...props} />;
    default:
      return null;
  }
}

export function SettingsDetailPanel(props: SettingsDetailPanelProps) {
  return (
    <section className="settings-detail">
      {props.activePrimary !== "models" && (
        <h3 className="settings-detail-title">{props.activeSecondaryTitle}</h3>
      )}
      {renderDetailContent(props)}
    </section>
  );
}
