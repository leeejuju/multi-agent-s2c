import type { SettingsSecondarySidebarProps } from "../types";
import { SettingsProviderIcon } from "./SettingsProviderIcon";

export function SettingsSecondarySidebar({
  activeSecondary,
  items,
  onSelectSecondary,
}: SettingsSecondarySidebarProps) {
  return (
    <section className="settings-sidebar settings-sidebar-secondary">
      <nav className="settings-sidebar-nav">
        {items.map((item) => (
          <button
            key={item.key}
            className={`settings-nav-button ${
              activeSecondary === item.key ? "is-active" : "is-inactive"
            }`}
            onClick={() => onSelectSecondary(item.key)}
            type="button"
          >
            <SettingsProviderIcon provider={item.key} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </section>
  );
}
