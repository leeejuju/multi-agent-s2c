import {
  Bot,
  Plug,
  UserCircle,
} from "lucide-react";
import type { SettingsPrimarySidebarProps } from "../types";
import type { PrimaryKey } from "../types";

const sectionIcons: Record<PrimaryKey, typeof Bot> = {
  models: Bot,
  mcp: Plug,
  account: UserCircle,
  chat: Bot,
  interface: Bot,
};

export function SettingsPrimarySidebar({
  activePrimary,
  sections,
  onSelectPrimary,
}: SettingsPrimarySidebarProps) {
  const renderSectionButton = (section: (typeof sections)[number]) => {
    const Icon = sectionIcons[section.key];

    return (
      <button
        key={section.key}
        className={`settings-nav-button ${
          activePrimary === section.key ? "is-active" : "is-inactive"
        }`}
        onClick={() => onSelectPrimary(section.key)}
        type="button"
      >
        <Icon size={20} strokeWidth={2} />
        <span>{section.label}</span>
      </button>
    );
  };

  return (
    <section className="settings-sidebar settings-sidebar-primary">
      <nav className="settings-sidebar-nav">
        {sections.map(renderSectionButton)}
      </nav>
    </section>
  );
}
