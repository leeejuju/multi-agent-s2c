import { useState } from "react";
import {
  ChevronDown,
  Clock,
  Compass,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  Plus,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import {
  Avatar,
  Collapsible,
  ScrollArea,
  ToggleGroup,
  Tooltip,
} from "radix-ui";

import "./Sidebar.css";

export const sidebarSectionIds = [
  "script",
  "storyboard",
  "story-graph",
  "library",
  "settings",
] as const;

export type SidebarSectionId = (typeof sidebarSectionIds)[number];

export type SidebarTab =
  | "new-prompt"
  | "recent"
  | "scripts-list"
  | "video-list"
  | "community"
  | "trash";

type SidebarNavButtonProps = {
  active: boolean;
  children: string;
  icon: LucideIcon;
  collapsed: boolean;
  value: SidebarTab;
};

function SidebarNavButton({
  active,
  children,
  collapsed,
  icon: Icon,
  value,
}: SidebarNavButtonProps) {
  const item = (
    <ToggleGroup.Item
      aria-label={children}
      className="studio-sidebar-nav-button"
      data-active={active}
      data-collapsed={collapsed}
      value={value}
    >
      <span className="studio-sidebar-nav-icon-shell">
        <Icon
          className="studio-sidebar-nav-icon"
          data-active={active}
          size={18}
        />
      </span>
      {collapsed ? null : <span>{children}</span>}
    </ToggleGroup.Item>
  );

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>{item}</Tooltip.Trigger>
      {collapsed ? (
        <Tooltip.Portal>
          <Tooltip.Content
            className="studio-sidebar-tooltip"
            side="right"
            sideOffset={8}
          >
            {children}
            <Tooltip.Arrow className="studio-sidebar-tooltip-arrow" />
          </Tooltip.Content>
        </Tooltip.Portal>
      ) : null}
    </Tooltip.Root>
  );
}

type SidebarProps = {
  accountEmail: string;
  activeTab: SidebarTab;
  onSelectTab: (tab: SidebarTab) => void;
  onProfile: () => void;
};

export default function Sidebar({
  accountEmail,
  activeTab,
  onProfile,
  onSelectTab,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <Tooltip.Provider delayDuration={250}>
      <Collapsible.Root
        asChild
        onOpenChange={(open) => setCollapsed(!open)}
        open={!collapsed}
      >
        <aside className="studio-sidebar" data-collapsed={collapsed}>
          <div className="studio-sidebar-brand" data-collapsed={collapsed}>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Collapsible.Trigger
                  aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
                  className="studio-sidebar-collapse-button"
                >
                  {collapsed ? (
                    <PanelLeftOpen size={18} />
                  ) : (
                    <PanelLeftClose size={18} />
                  )}
                </Collapsible.Trigger>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="studio-sidebar-tooltip"
                  side="right"
                  sideOffset={8}
                >
                  {collapsed ? "展开侧边栏" : "收起侧边栏"}
                  <Tooltip.Arrow className="studio-sidebar-tooltip-arrow" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>

          <ScrollArea.Root className="studio-sidebar-main" type="hover">
            <ScrollArea.Viewport className="studio-sidebar-viewport">
              <ToggleGroup.Root
                aria-label="工作台页面"
                className="studio-sidebar-nav"
                onValueChange={(value) => {
                  if (value) {
                    onSelectTab(value as SidebarTab);
                  }
                }}
                orientation="vertical"
                type="single"
                value={activeTab}
              >
                <SidebarNavButton
                  active={activeTab === "new-prompt"}
                  collapsed={collapsed}
                  icon={Plus}
                  value="new-prompt"
                >
                  新建
                </SidebarNavButton>
                <SidebarNavButton
                  active={activeTab === "recent"}
                  collapsed={collapsed}
                  icon={Clock}
                  value="recent"
                >
                  最近
                </SidebarNavButton>
                <SidebarNavButton
                  active={activeTab === "scripts-list"}
                  collapsed={collapsed}
                  icon={FileText}
                  value="scripts-list"
                >
                  剧本项目
                </SidebarNavButton>
                <SidebarNavButton
                  active={activeTab === "community"}
                  collapsed={collapsed}
                  icon={Compass}
                  value="community"
                >
                  社区
                </SidebarNavButton>
                <SidebarNavButton
                  active={activeTab === "trash"}
                  collapsed={collapsed}
                  icon={Trash2}
                  value="trash"
                >
                  回收站
                </SidebarNavButton>
              </ToggleGroup.Root>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
              className="studio-sidebar-scrollbar"
              orientation="vertical"
            >
              <ScrollArea.Thumb className="studio-sidebar-scrollbar-thumb" />
            </ScrollArea.Scrollbar>
          </ScrollArea.Root>

          <div className="studio-sidebar-footer">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button
                  aria-label="打开个人账户设置"
                  className="studio-sidebar-profile-button"
                  data-collapsed={collapsed}
                  onClick={onProfile}
                  type="button"
                >
                  <span
                    className="studio-sidebar-profile-content"
                    data-collapsed={collapsed}
                  >
                    <Avatar.Root className="studio-sidebar-avatar">
                      <Avatar.Fallback>
                        {accountEmail.slice(0, 2).toUpperCase()}
                      </Avatar.Fallback>
                    </Avatar.Root>
                    {collapsed ? null : (
                      <span className="studio-sidebar-profile-copy">
                        <span className="studio-sidebar-profile-email">
                          {accountEmail}
                        </span>
                      </span>
                    )}
                  </span>
                  {collapsed ? null : (
                    <ChevronDown
                      className="studio-sidebar-profile-chevron"
                      size={14}
                    />
                  )}
                </button>
              </Tooltip.Trigger>
              {collapsed ? (
                <Tooltip.Portal>
                  <Tooltip.Content
                    className="studio-sidebar-tooltip"
                    side="right"
                    sideOffset={8}
                  >
                    {accountEmail}
                    <Tooltip.Arrow className="studio-sidebar-tooltip-arrow" />
                  </Tooltip.Content>
                </Tooltip.Portal>
              ) : null}
            </Tooltip.Root>
          </div>
        </aside>
      </Collapsible.Root>
    </Tooltip.Provider>
  );
}
